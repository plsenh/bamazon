require("dotenv").config();
const inquirer = require("inquirer");
const mysql = require("mysql");
const chalk = require("chalk");
const cTable = require("console.table");

// connection settings
var connection = mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: process.env.user,
    password: process.env.password,
    database: "bamazon"
});

// connect to db and show initial products
connection.connect(function (err) {
    if (err) console.log("error:", err);
    console.log("\n" + chalk.yellow("Welcome to bamazon! Current product selection:"));
    showProducts();
});

// function to show products and inquire customer
function showProducts() {
    connection.query("SELECT * FROM products", function (err, res) {
        if (err) throw err;
        console.log();
        console.table(res);
        purchaseInquiry();
    })
}

// function to initiate purchase from customer
function purchaseInquiry() {
    inquirer
        .prompt([{
            type: "input",
            message: chalk.blue("Enter product ID of the item you'd like to purchase:"),
            name: "productID",
            validate: value => (value !== "" && !isNaN(value)),
            filter: Number
        }, {
            type: "input",
            message: chalk.blue("Enter desired quantity:"),
            name: "quantity",
            validate: value => (value !== "" && !isNaN(value)),
            filter: Number
        }])
        .then(function (answer) {
            var prodID = parseInt(answer.productID);
            var qty = parseInt(answer.quantity);

            validatePurchase(prodID, qty);
        });
}

function validatePurchase(prodID, qty) {

    var query = "SELECT * FROM products WHERE ?";

    // query the database for all items being sold
    connection.query(query, {
        item_id: prodID
    }, function (err, results) {
        if (err) throw err;

        if (results.length === 0) {
            console.log(chalk.red("Please enter a valid product ID"));
            showProducts();
        } else {
            var chosenId;
            for (var i = 0; i < results.length; i++) {
                if (results[i].item_id === prodID) {
                    chosenId = results[i];
                }
            }

            // check if quantity is valid
            if (chosenId.stock_quantity >= parseInt(qty)) {
                // update db qty and prompt to buy more products
                connection.query(
                    "UPDATE products SET ? WHERE ?",
                    [{
                            stock_quantity: chosenId.stock_quantity - qty
                        },
                        {
                            item_id: prodID
                        }
                    ],
                    function (error) {
                        if (error) throw err;

                        if (qty > 0) {
                            console.log(chalk.green("\nOrder placed successfully!"));
                            console.log("Item: " + chalk.yellow(chosenId.product_name) + ", Quantity: " + chalk.yellow(qty));
                            console.log("Total Cost: " + chalk.yellow("$" + (chosenId.price * qty).toFixed(2)) + "\n");
                        } else {
                            console.log("\nOrder of " + chosenId.product_name + " canceled\n");
                        }

                        buyMore();
                    }
                );
            } else {
                // qty was invalid
                console.log(chalk.red("Sorry, insufficient quantity, please try again."));
                showProducts();
            }
        }

    });
}

function buyMore() {
    inquirer
        .prompt([{
            type: "confirm",
            message: chalk.blue("Would you like to buy another product?"),
            name: "confirm",
            default: true
        }])
        .then(function (answer) {
            if (answer.confirm) {
                showProducts();
            } else {
                console.log("Thanks for shopping at bamazon!");
                connection.end();
            }
        });
}