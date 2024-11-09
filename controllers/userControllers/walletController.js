const User = require("../../models/userModel");
const Wallet = require("../../models/walletModel");

const renderWallet = async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            req.flash("error", "Please login");
            return res.redirect("/login");
        }

        // Add await keyword here
        const user = await User.findById(userId).lean();

        if (!user) {
            console.error(`User not found for id: ${userId}`);
            req.flash("error", "User account not found. Please log in again.");
            return res.redirect("/login");
        }

        const wallet = await Wallet.findOne({ userId: userId }).lean();

        if (!wallet) {
            console.error(`Wallet not found for user: ${userId}`);
            req.flash("error", "Wallet not found.");
            return res.redirect("/user-profile");
        }

        // Clean the data before sending to template
        const cleanUserData = {
            _id: user._id?.toString(),
            name: user.name,
            email: user.email
            // Add any other necessary user fields
        };

        const cleanWallet = {
            balance: wallet.balance,
            transactions: wallet.transactions.map(transaction => ({
                amount: transaction.amount,
                transactionMethod: transaction.transactionMethod,
                date: transaction.date,
                description: transaction.description
            })).sort((a, b) => new Date(b.date) - new Date(a.date))
        };

        res.render("wallet", {
            title: "Your Wallet",
            balance: cleanWallet.balance,
            transactions: cleanWallet.transactions,
            userData: cleanUserData
            // Removed duplicate title
        });
    } catch (error) {
        console.error("Error in renderWallet:", error);
        req.flash("error", "An unexpected error occurred. Please try again.");
        res.redirect("/");
    }
};

module.exports = {
    renderWallet,
};