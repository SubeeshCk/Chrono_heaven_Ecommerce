// wishlist operations

document.addEventListener('DOMContentLoaded', function() {
    const wishlistButtons = document.querySelectorAll('.btn-addwish-b2');
    
    wishlistButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.getAttribute('data-product-id');
            const isInWishlist = this.querySelector('.icon-heart1').src.includes('icon-heart-02.png');
            
            if (isInWishlist) {
                removeFromWishlist(productId, this);
            } else {
                addToWishlist(productId, this);
            }
        });
    });
});

function addToWishlist(productId, button) {
    fetch(`/addToWishlist?productId=${productId}`, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateWishlistIcon(button, true);
            updateWishlistCount(1);
            updateHeaderWishlistCount(1);
        }
    })
    .catch(error => console.error('Error:', error));
}

function removeFromWishlist(productId, button) {
    fetch(`/RemoveFromWishlist?productId=${productId}`, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === "Item removed from wishlist") {
            updateWishlistIcon(button, false);
            updateWishlistCount(-1);
            updateHeaderWishlistCount(-1);
        }
    })
    .catch(error => console.error('Error:', error));
}

function updateWishlistIcon(button, isInWishlist) {
    const icon = button.querySelector('.icon-heart1');
    if (isInWishlist) {
        icon.src = "/userAssets/images/icons/icon-heart-02.png";
    } else {
        icon.src = "/userAssets/images/icons/icon-heart-01.png";
    }
}

function updateWishlistCount(change) {
    const countElement = document.querySelector('.wishlist-count');
    if (countElement) {
        let count = parseInt(countElement.textContent) + change;
        countElement.textContent = count;
    }
}

function updateHeaderWishlistCount(change) {
    const headerCountElement = document.querySelector('.icon-header-noti[href="/wishlist"]');
    if (headerCountElement) {
        let currentCount = parseInt(headerCountElement.getAttribute('data-notify')) || 0;
        let newCount = currentCount + change;
        headerCountElement.setAttribute('data-notify', newCount.toString());
    }
}