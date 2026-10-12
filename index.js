require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
async function main() {
    await mongoose.connect(process.env.MONGO_URI);
}

main()
    .then(() => console.log('DB Connected'))
    .catch((err) => console.error('DB Connection Error:', err));

// Book Schema
const bookSchema = new mongoose.Schema({
    name: String,
    title: String,
    author: String,
    price: Number,
    category: String,
    image: String
});

const Book = mongoose.model('Book', bookSchema);


const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: String,
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);


// Express Setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'bookheaven-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Cart Count
app.use((req, res, next) => {
    const cart = req.session.cart || [];

    res.locals.cartCount = cart.reduce(
        (sum, item) => sum + item.quantity, 0
    );

    next();
});

// Email Setup
const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000
});

transport.verify((error) => {
    if (error) {
        console.error('SMTP ERROR:', error);
    } else {
        console.log('SMTP server is ready');
    }
});


// Home
app.get('/', (req, res) => {
    res.render('home');
});

// About
app.get('/about', (req, res) => {
    res.render('about');
});

// All Books
app.get('/books', async (req, res) => {
    try {
        const books = await Book.find();
        res.render('books', { books });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading books');
    }
});

// Add to Cart
app.post('/cart/add/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).send('Book not found');
        }

        if (!req.session.cart) {
            req.session.cart = [];
        }

        const existingItem = req.session.cart.find(
            item => item.bookId === book._id.toString()
        );

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            req.session.cart.push({
                bookId: book._id.toString(),
                name: book.name || book.title,
                price: book.price,
                image: book.image,
                quantity: 1
            });
        }

        res.redirect('/cart');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding book to cart');
    }
});

// View Cart
app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    res.render('cart', { cart, total });
});

// Remove from Cart
app.post('/cart/remove/:id', (req, res) => {
    const cart = req.session.cart || [];

    req.session.cart = cart.filter(
        item => item.bookId !== req.params.id
    );

    res.redirect('/cart');
});

// Update Cart Quantity
app.post('/cart/update/:id', (req, res) => {
    const cart = req.session.cart || [];
    const item = cart.find(book => book.bookId === req.params.id);

    if (item) {
        const change = Number(req.body.change);

        if (change === 1) {
            item.quantity += 1;
        } else if (change === -1) {
            item.quantity -= 1;
        }

        if (item.quantity <= 0) {
            req.session.cart = cart.filter(
                book => book.bookId !== req.params.id
            );
        }
    }

    res.redirect('/cart');
});

// Categories
app.get('/category', async (req, res) => {
    try {
        const books = await Book.find();
        const categories = [
            ...new Set(books.map(book => book.category).filter(Boolean))
        ];

        res.render('categories', { categories });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading categories');
    }
});

// Books by Category
app.get('/category/:category', async (req, res) => {
    try {
        const books = await Book.find({
            category: req.params.category
        });

        res.render('books', { books });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading books');
    }
});

// Contact Page
app.get('/contact', (req, res) => {
    res.render('contact');
});

// Contact Form


app.post('/contact', async (req, res) => {
    try {
        const { name, email, mob, message } = req.body;

        await Contact.create({
            name,
            email,
            mobile: mob,
            message
        });

        return res.send(`
            <h2>Thank you for contacting BookHeaven!</h2>
            <p>Your message has been saved successfully.</p>
            <a href="/contact">Back to Contact Us</a>
        `);
    } catch (error) {
        console.error('CONTACT FORM ERROR:', error);
        return res.status(500).send(
            'Unable to save your message. Please try again.'
        );
    }
});



// Start Server
app.listen(PORT, () => {
    console.log('Listening on ' + PORT);
});