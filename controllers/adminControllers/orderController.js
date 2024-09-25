const API_ROUTES = require ("../../config/apiRoutes");
const renderOrder = async (req,res) => {
    try {
        res.render("orders");
    } catch (error) {
        console.log(error.message);
        
    }
};


const renderOrderDetails = async (req,res) =>{
    try {
        res.render("order-details");
    } catch (error) {
        console.log(error.message);
    }
}


module.exports = {
    renderOrder,
    renderOrderDetails
}