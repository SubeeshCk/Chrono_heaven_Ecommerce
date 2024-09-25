const API_ROUTES = {
    CUSTOMER: {
      LIST: '/admin/customers',
      BLOCK: '/admin/customers/block',
      UNBLOCK: '/admin/customers/unblock',
      PROFILE: '/admin/customers/customer-profile',
    },
    CATEGORY: {
      LIST: '/admin/categories',
      ADD: '/admin/categories/add-category',
      EDIT:'admin/categories/edit-categor/:id?',
      UPDATE:'admin/categories/edit-categor/:id?'
    },
    PRODUCT: {
      LIST: '/admin/products',
      ADD: '/admin/products/add-products',
      UPDATE: '/admin/products/update-products'
    },
    ORDER: {

    },

  };
  
  module.exports = API_ROUTES;
  