const mongoose = require('mongoose');
const vdator = require('validator');
const jwt = require('jsonwebtoken');
const ld = require('lodash');

let MessageSchema = new mongoose.Schema({
  firstUser: { type: String},
  secondUser: { type: String },
  messages: [{
    message: { type: String },
    sender: { type: String },
    time_stamp: { type: Date, default: Date.now() },
  }]
})

/* Creating the user model from the schema and giving it to Mongoose */
let Message = mongoose.model('message', MessageSchema);

module.exports = Message;