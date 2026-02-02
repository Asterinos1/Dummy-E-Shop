const Joi = require('joi');

// Schema for creating an order
const orderSchema = Joi.object({
  products: Joi.array().items(
    Joi.object({
      product_id: Joi.number().integer().required(),
      title: Joi.string().required(),
      amount: Joi.number().integer().min(1).required()
    })
  ).min(1).required(),
  total_price: Joi.number().min(0).precision(2).required()
});

module.exports = { orderSchema };