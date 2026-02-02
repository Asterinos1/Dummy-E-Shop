const { Kafka } = require('kafkajs');
const logger = require('./index').logger; // Circular dependency handled by requiring inside function or passing logger. 
// Ideally, logger should be in its own file. For simplicity, we'll use console or pass db pool.

class KafkaService {
  constructor(pool) {
    this.pool = pool;
    this.kafka = new Kafka({
      clientId: 'product-service',
      brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'product-group' });
  }

  async connect() {
    await this.producer.connect();
    await this.consumer.connect();
    // Subscribe to the topic where Orders are announced
    await this.consumer.subscribe({ topic: 'order-topic', fromBeginning: false });
    
    console.log('Kafka Connected: Listening for Orders...');
    
    // Start processing loop
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const orderData = JSON.parse(message.value.toString());
        await this.handleOrder(orderData);
      },
    });
  }

  /**
   * Core Logic for "Part 2": Check Stock & Reserve
   */
  async handleOrder(order) {
    const { orderId, products } = order;
    console.log(`Processing Order #${orderId}`);

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN'); // Start Transaction

      let isSuccess = true;

      // Check and update stock for EACH product in the order
      for (const item of products) {
        // Atomic Update: Decrement ONLY if quantity >= requested amount
        const res = await client.query(
          `UPDATE products 
           SET quantity = quantity - $1, updated_at = NOW()
           WHERE id = $2 AND quantity >= $1 
           RETURNING id`,
          [item.amount, item.product_id]
        );

        if (res.rowCount === 0) {
          isSuccess = false; // Stock insufficient or product not found
          console.warn(`Insufficient stock for Product ID ${item.product_id}`);
          break; // Stop processing this order
        }
      }

      if (isSuccess) {
        await client.query('COMMIT');
        await this.sendResponse(orderId, 'Success');
        console.log(`Order #${orderId} Approved`);
      } else {
        await client.query('ROLLBACK');
        await this.sendResponse(orderId, 'Reject');
        console.log(`Order #${orderId} Rejected (Insufficient Stock)`);
      }

    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Error processing Order #${orderId}:`, err);
      // In a real app, you might send a 'Error' status or retry via Dead Letter Queue
    } finally {
      client.release();
    }
  }

  async sendResponse(orderId, status) {
    await this.producer.send({
      topic: 'order-result',
      messages: [
        { value: JSON.stringify({ orderId, status }) }
      ],
    });
  }
}

module.exports = KafkaService;