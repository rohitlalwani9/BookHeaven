require('dotenv').config();
const path = require("path");
const express = require('express');
const session = require('express-session');
const app = express();
const PORT = 3000;

const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/bookstore');
}

main()
.then(() => {console.log('DB Connected')})
.catch((err) => {console.log(err)});

const bookSchema = new mongoose.Schema({
    name: String,
    title: String,
    author: String,
    price: Number,
    category: String,
    image: String
});

const Book = mongoose.model('Book', bookSchema);
app.set('views',path.join(__dirname,'views'))
app.set('view engine','ejs')
app.set(express.static(path.join(__dirname,'public')));

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

app.use(session({
    secret: 'bookstore-session-secret-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    }
}));
app.use((req, res, next) => {
    const cart = req.session.cart || [];

    res.locals.cartCount = cart.reduce(
        (sum, item) => sum + item.quantity, 0
    );

    next();
});
const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
transport.verify((error, success) => {
    if (error) {
        console.log("SMTP ERROR:", error);
    } else {
        console.log("SMTP server is ready");
    }
});
app.get('/',(req,res)=>{
    res.render('home')
})
app.get('/about',(req,res)=>{
    res.render('about')
})
app.get('/books', async (req, res) => {
    const books = await Book.find();
    res.render('books', { books });
});

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
        console.log(err);
        res.status(500).send('Error adding book to cart');
    }
});

app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    res.render('cart', { cart, total });
});

app.post('/cart/remove/:id', (req, res) => {
    const cart = req.session.cart || [];

    req.session.cart = cart.filter(
        item => item.bookId !== req.params.id
    );

    res.redirect('/cart');
});


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


app.get('/category', async (req, res) => {
    try {
        const books = await Book.find();
        const categories = [...new Set(books.map(book => book.category))];

        res.render('categories', { categories });
    } catch (err) {
        console.log(err);
        res.status(500).send('Error loading categories');
    }
});

app.get('/category/:category', async (req, res) => {
    try {
        const books = await Book.find({
            category: req.params.category
        });

        res.render('books', { books });
    } catch (err) {
        console.log(err);
        res.status(500).send('Error loading books');
    }
});


app.get('/contact',(req,res)=>{
    res.render('contact')
})

app.post('/contact', (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const mobile = req.body.mob;
    const message = req.body.message;

    transport.sendMail({
        to: 'rohitlalwani4550@gmail.com',
        subject: 'New Customer Message',
        text: `Name: ${name}\nEmail: ${email}\nMobile: ${mobile}\nMessage: ${message}`
    }, (error, info) => {
        if (error) {
            console.error('EMAIL ERROR:', error);
            return res.status(500).send('Email could not be sent. Check VS Code terminal.');
        }

        console.log('Email sent:', info.response);
        return res.redirect('/contact');
    });
});



app.listen(PORT,()=>{
    console.log("Listening on "+PORT)
})




// http://localhost:3000 --- run chrome
// E:\Node\Book Store> ---node index.js
// cd "E:\Node\Book Store"



