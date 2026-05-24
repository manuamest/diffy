// Example code for Diffy
window.DEMO_ORIGINAL = `class ShoppingCart {
    constructor() {
        this.items = [];
        this.discountCode = null;
    }

    addItem(item) {
        if (!item || !item.id || item.price < 0) {
            return false;
        }
        this.items.push(item);
        return true;
    }

    removeItem(itemId) {
        const index = this.items.findIndex(item => item.id === itemId);
        if (index > -1) {
            this.items.splice(index, 1);
            return true;
        }
        return false;
    }

    applyDiscount(code) {
        if (code === "SUMMER20") {
            this.discountCode = 0.20;
        } else if (code === "WINTER10") {
            this.discountCode = 0.10;
        } else {
            this.discountCode = 0;
        }
    }

    calculateTotal() {
        let total = 0;
        for (let i = 0; i < this.items.length; i++) {
            total += this.items[i].price;
        }
        
        if (this.discountCode) {
            total = total - (total * this.discountCode);
        }
        
        return total;
    }

    checkout() {
        console.log("Processing payment for total: " + this.calculateTotal());
        // Temporary database call
        db.saveOrder(this.items);
        this.items = [];
    }
}`;

window.DEMO_MODIFIED = `class ShoppingCart {
    constructor() {
        this.items = [];
        this.discountCode = null;
        this.taxRate = 0.15; // Added tax rate
    }

    addItem(item) {
        if (!item || !item.id || item.price < 0) {
            throw new Error("Invalid item properties"); // Refactored to throw errors
        }
        
        // Check if item already exists to increment quantity
        const existing = this.items.find(i => i.id === item.id);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            this.items.push({ ...item, quantity: 1 });
        }
    }

    removeItem(itemId) {
        this.items = this.items.filter(item => item.id !== itemId); // Simplified deletion
    }

    applyDiscount(code) {
        const discounts = {
            "SUMMER20": 0.20,
            "WINTER10": 0.10,
            "SPRING15": 0.15 // New discount code
        };
        this.discountCode = discounts[code] || 0;
    }

    calculateSubtotal() { // Split calculateTotal into subtotal, discount, tax
        return this.items.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
    }

    calculateTotal() {
        const subtotal = this.calculateSubtotal();
        const discountAmount = subtotal * (this.discountCode || 0);
        const taxableAmount = subtotal - discountAmount;
        return taxableAmount + (taxableAmount * this.taxRate);
    }

    async checkout(paymentGateway) { // Made asynchronous and injected payment gateway dependency
        const total = this.calculateTotal();
        console.log(\`Processing secure payment of \$\${total.toFixed(2)}\`);
        
        try {
            await paymentGateway.charge(total);
            this.items = [];
            this.discountCode = null;
        } catch (error) {
            console.error("Checkout failed:", error.message);
            throw error;
        }
    }
}`;
