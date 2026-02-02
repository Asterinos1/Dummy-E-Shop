const Joi = require('joi');

const productSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).allow('').optional(),
  price: Joi.number().min(0).precision(2).required(),
  image_url: Joi.string().uri().allow('').optional(),
  quantity: Joi.number().integer().min(0).required()
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  description: Joi.string().max(500).allow(''),
  price: Joi.number().min(0).precision(2),
  image_url: Joi.string().uri().allow(''),
  quantity: Joi.number().integer().min(0)
}).min(1); // Require at least one field to update

module.exports = { productSchema, updateProductSchema };