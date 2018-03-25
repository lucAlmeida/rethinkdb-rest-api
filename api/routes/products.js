const express = require('express');
const r = require('rethinkdb');
const router = express.Router();
const config = require('../../config');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, new Date().toISOString() + file.originalname);
    }
})
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(null, false);
    }
}
const upload = multer({
    storage: storage, 
    limits: {
        fileSize: 1024 * 1024 * 5
    },
    fileFilter: fileFilter
});

router.get('/', (req, res, next) => {
    r.connect(config.rethinkdb).then(function(conn) {
        r.table("products").run(conn).then(function(cursor) {
            cursor.toArray().then(function(docs) {
                const response = {
                    count: docs.length,
                    products: docs.map(doc => {
                        return {
                            name: doc.name,
                            price: doc.price,
                            productImage: doc.productImage,
                            id: doc.id,
                            request: {
                                type: 'GET',
                                url: 'http://localhost:3000/products/' + doc.id
                            }
                        }
                    })
                }
                res.status(200).json(response);
            }).catch(function(err) {
                console.log(err);
                res.status(500).json({
                    error: err
                });
            });
        });
    });
});

router.post('/', upload.single('productImage'), (req, res, next) => {
    const product = req.body;
    product.productImage = req.file.path;

    r.connect(config.rethinkdb).then(function(conn) {
        r.table("products").insert(product, {returnChanges: true}).run(conn).then(function(result) {
            res.status(201).json({
                message: "Created product successfully",
                createdProduct: {
                    name: result.changes[0].new_val.name,
                    price: result.changes[0].new_val.price,
                    id: result.changes[0].new_val.id,
                    request: {
                        type: 'GET',
                        url: 'http://localhost:3000/products/' + result.changes[0].new_val.id
                    }
                }
            })
        }).catch(function(err) {
            console.log(err);
            res.status(500).json({
                error: err
            });
        })
    });
});

router.get('/:productId', (req, res, next) => {
    const id = req.params.productId;
    r.connect(config.rethinkdb).then(function(conn) {    
        r.table('products').filter(r.row('id').eq(id)).run(conn).then(function(cursor) {
            cursor.toArray().then(function(result) {
                console.log("From database", result);
                if (result.length > 0) {
                    res.status(200).json({
                        product: result[0],
                        request: {
                            type: 'GET',
                            url: 'http://localhost:3000/products'
                        }
                    });
                } else {
                    res.status(404).json({message: 'No valid entry found for provided ID'});
                }
            })
        }).catch(function(err) {
            console.log(err);
            res.status(500).json({error: err});
        });
    })
});

router.patch('/:productId', (req, res, next) => {
    const id = req.params.productId;
    const updateOps = {};

    for (const ops of req.body) {
        updateOps[ops.propName] = ops.value;
    }

    r.connect(config.rethinkdb).then(function(conn) {
        r.table('products').filter(r.row('id').eq(id)).update(updateOps)
                                                      .run(conn).then(function(result) {
            res.status(200).json({
                message: 'Product updated',
                request: {
                    type: 'GET',
                    url: 'http://localhost:3000/products/' + id
                }
            });
        }).catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
    });
});

router.delete('/:productId', (req, res, next) => {
    const id = req.params.productId;
    
    r.connect(config.rethinkdb).then(function(conn) {
        r.table('products').get(id).delete().run(conn).then(function(result) {
            res.status(200).json({
                message: 'Product deleted',
                request: {
                    type: 'POST',
                    url: 'http://localhost:3000/products',
                    body: { name: 'String', price: 'Number' }
                }
            });
        }).catch(err => {
            console.log(err);
            res.status(500).json({
                error: err
            });
        });
    });
});

module.exports = router;
