const { Kafka } = require('kafkajs');

class KafkaService {
  constructor(pool) {
    this.pool = pool;
    this.kafka = new Kafka({
      clientId: 'order-service',
      brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'order-group' });
  }

  async connect() {
    await this.producer.connect();
    await this.consumer.connect();
    
    // Listen for the "Result" from Product Service
    await this.consumer.subscribe({ topic: 'order-result', fromBeginning: false });
    
    console.log('Kafka Connected: Listening for Order Results...');

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const resultData = JSON.parse(message.value.toString());
        await this.handleOrderResult(resultData);
      },
    });
  }

  /**
   * Step 1: Send the new order to Product Service to check stock
   */
  async sendOrderForValidation(order) {
    // Structure: { orderId: 1, products: [...] }
    const payload = {
      orderId: order.id,
      products: order.products 
    };

    console.log(`Sending Order #${order.id} for validation...`);
    
    await this.producer.send({
      topic: 'order-topic',
      messages: [
        { value: JSON.stringify(payload) }
      ],
    });
  }

  /**
   * Step 3: Receive result (Success/Reject) and update DB
   */
  async handleOrderResult(result) {
    const { orderId, status } = result;
    console.log(`Received Result for Order #${orderId}: ${status}`);

    try {
      await this.pool.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, orderId]
      );
      console.log(`Order #${orderId} status updated to: ${status}`);
    } catch (err) {
      console.error(`Failed to update status for Order #${orderId}:`, err);
    }
  }
}

module.exports = KafkaService;