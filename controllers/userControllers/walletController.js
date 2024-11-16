const User = require("../../models/userModel");
const Wallet = require("../../models/walletModel");

const renderWallet = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            req.flash("error", "Please login");
            return res.redirect("/login");
        }
        const page = parseInt(req.query.page) || 1;
        const limit = 10; 

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

        const sortedTransactions = wallet.transactions
            .map(transaction => ({
                amount: transaction.amount,
                transactionMethod: transaction.transactionMethod,
                date: transaction.date,
                description: transaction.description
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalTransactions = sortedTransactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

        const cleanUserData = {
            _id: user._id?.toString(),
            name: user.name,
            email: user.email
        };

        res.render("wallet", {
            title: "Your Wallet",
            balance: wallet.balance,
            transactions: paginatedTransactions,
            userData: cleanUserData,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1
            }
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