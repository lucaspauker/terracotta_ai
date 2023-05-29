import User from '../../../schemas/User';

const createError = require('http-errors');
const mongoose = require('mongoose');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(400).json({ error: 'Use POST request' })
  }

  try {

    await mongoose.connect(process.env.MONGOOSE_URI);

    const email = request.body.email;
    const first_name = request.body.first_name;
    const last_name = request.body.last_name;
    const picture = request.body.picture;

    if (!email) {
      throw createError(400,'Must provide email!');
    }
    if (!first_name) {
      throw createError(400,'Must provide first name!')
    }
    if (!last_name) {
      throw createError(400,'Must provide last name!')
    }

    // Create user
    await User.create({
      email: email,
      firstName: first_name,
      lastName: last_name,
      picture: picture,
    });

  } catch (error) {
    if (error.code === 11000) {
      error = createError(400, 'Another user with the same email exists');
    } else if (!error.status) {
      error = createError(500, 'Error creating user');
    }
    response.status(error.status).json({ error: error.message });
  }
}
