const r = require('rethinkdb');
const config = require('../../config');

exports.orders_get_all = (req, res, next) => {
    r.connect(config.rethinkdb).then(function(conn) {
        r.table("orders").run(conn).then(function(cursor) {
            cursor.toArray().then(function(docs) {
                const response = {
                    count: docs.length,
                    orders: docs.map(doc => {
                        return {
                            id: doc.id,
                            product: doc.product,
                            quantity: doc.quantity,
                            request: {
                                type: 'GET',
                                url: 'http://localhost:3000/orders/' + doc.id
                            }
                        }
                    })
                };
                res.status(200).json(response);
            })
        }).catch(function(err) {
            res.status(500).json({
                error: err
            });
        });
    });
}

exports.orders_create_order = (req, res, next) => {
    const product = req.body.productId;
    r.connect(config.rethinkdb).then(function(conn) {
        r.table("products").get(product).run(conn).then(function(product) {
            if (!product) {
                throw new Error("Product not found");
            }
            const order = {};
            order.quantity = req.body.quantity;
            order.product = req.body.productId;
            r.connect(config.rethinkdb).then(function(conn) {
                r.table("orders").insert(order, {returnChanges: true}).run(conn).then(function(result) {
                    res.status(201).json({
                        message: 'Order stored',
                        createdOrder: {
                            id: result.changes[0].new_val.id,
                            quantity: result.changes[0].new_val.quantity,
                            product: result.changes[0].new_val.product
                        },
                        request: {
                            type: 'GET',
                            url: 'http://localhost:3000/orders/' + result.changes[0].new_val.id
                        }
                    });
                }).catch(function(err) {
                    res.status(500).json({
                        error: err
                    });
                });
            })
        }).catch(function(err) {
            return res.status(404).json({
                message: err.message
            });
        });
    });
}

exports.orders_get_order = (req, res, next) => {
    const id = req.params.orderId;
    r.connect(config.rethinkdb).then(function(conn) {
        r.table('orders').get(id).run(conn).then(function(order) {
            if (!order) {
                return res.status(404).json({
                    message: "Order not found"
                });
            }
            res.status(200).json({
                order: order,
                request: {
                    type: 'GET',
                    url: 'http://localhost:3000/orders'
                }
            });
        }).catch(err => {
            res.status(500).json({
                error: err
            });
        });
    });
}

exports.orders_delete_order = (req, res, next) => {
    const id = req.params.orderId;

    r.connect(config.rethinkdb).then(function(conn) {
        r.table('orders').get(id).delete().run(conn).then(function(result) {
            res.status(200).json({
                message: 'Order deleted',
                request: {
                    type: "POST",
                    url: 'http://localhost:3000/orders',
                    body: { productId: "ID", quantity: "Number"}
                }
            });
        })
        .catch(err => {
            res.status(500).json({
                error: err
            });
        });
    });
}
