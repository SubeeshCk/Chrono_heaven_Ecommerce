const User = require ("../../models/userModel");
const product = require ("../../models/product");
const { statusCode } = require("../../config/statusCode");


const renderProfile = async (req,res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.redirect("/login");
        }

        const userData = await User.findById(userId);

        if (!userData) {
            console.log("User not found");
            return res.status(404).send("User not found");
        }

        res.render("user-profile", { userData });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

const editProfile = async (req,res) => {
    try {
        let userData = res.locals.userData;
        
        if(!userData){
            
        }
    } catch (error) {
        console.log(error.message);
        
    }
}

module.exports = {
    renderProfile,
    editProfile

}