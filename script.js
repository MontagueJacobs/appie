// Language translation system
let currentLanguage = localStorage.getItem('language') || 'en';

const translations = {
    en: {
        nav: {
            home: 'Home',
            about: 'About',
            services: 'Services',
            purchaseHistory: 'Purchase History',
            contact: 'Contact'
        },
        receipt: {
            details: 'Receipt Details',
            items: 'Items Purchased',
            discount: 'Your Savings',
            total: 'Total',
            quantity: 'Qty',
            backToList: 'Back to Receipts'
        },
        login: {
            title: 'Sign in with your Albert Heijn account to see your purchase history.',
            step1: 'Click the button below to open Albert Heijn login in a new tab',
            loginButton: 'Login with Albert Heijn',
            step2AfterLogin: 'After logging in:',
            lookAtUrl: 'Look at the URL bar or popup',
            copyCode: 'Copy just the code part',
            linuxUsers: 'Linux users: If you see a popup saying "No Apps Available", don\'t close it yet!',
            pasteCode: 'Then paste the code or full URL below:',
            placeholder: 'Paste code or full URL here',
            completeLogin: 'Complete Login',
            orAutoDetect: 'OR try automatic clipboard detection:',
            autoDetect: '📋 Auto-Detect from Clipboard',
            hint: 'First copy the URL/code, then click this button'
        },
        modal: {
            brand: 'Brand',
            size: 'Size',
            price: 'Price',
            bonus: '🏷️ Bonus Product',
            properties: 'Properties',
            highlights: 'Highlights',
            fullDescription: 'Full Description',
            nutritionalInfo: 'Nutritional Information',
            noInfo: 'No detailed information available for this product.'
        }
    },
    nl: {
        nav: {
            home: 'Home',
            about: 'Over Ons',
            services: 'Diensten',
            purchaseHistory: 'Aankoopgeschiedenis',
            contact: 'Contact'
        },
        receipt: {
            details: 'Bondetails',
            items: 'Gekochte Artikelen',
            discount: 'Uw Voordeel',
            total: 'Totaal',
            quantity: 'Aantal',
            backToList: 'Terug naar Bonnen'
        },
        login: {
            title: 'Log in met uw Albert Heijn account om uw aankoopgeschiedenis te zien.',
            step1: 'Klik op de knop hieronder om Albert Heijn login in een nieuw tabblad te openen',
            loginButton: 'Inloggen met Albert Heijn',
            step2AfterLogin: 'Na het inloggen:',
            lookAtUrl: 'Kijk naar de URL-balk of popup',
            copyCode: 'Kopieer alleen het code gedeelte',
            linuxUsers: 'Linux gebruikers: Als u een popup ziet met "Geen Apps Beschikbaar", sluit deze dan nog niet!',
            pasteCode: 'Plak vervolgens de code of volledige URL hieronder:',
            placeholder: 'Plak code of volledige URL hier',
            completeLogin: 'Voltooien Login',
            orAutoDetect: 'OF probeer automatische klembord detectie:',
            autoDetect: '📋 Auto-Detecteren van Klembord',
            hint: 'Kopieer eerst de URL/code en klik vervolgens op deze knop'
        },
        modal: {
            brand: 'Merk',
            size: 'Grootte',
            price: 'Prijs',
            bonus: '🏷️ Bonus Product',
            properties: 'Eigenschappen',
            highlights: 'Hoogtepunten',
            fullDescription: 'Volledige Beschrijving',
            nutritionalInfo: 'Voedingswaarde',
            noInfo: 'Geen gedetailleerde informatie beschikbaar voor dit product.'
        }
    }
};

// Function to translate text using Google Translate API (for product descriptions)
async function translateText(text, targetLang) {
    if (!text || targetLang === 'nl') return text; // Don't translate if already Dutch or empty
    
    try {
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=nl&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
        const data = await response.json();
        return data[0].map(item => item[0]).join('');
    } catch (error) {
        console.error('Translation error:', error);
        return text; // Return original if translation fails
    }
}

// Update UI text based on current language
function updateLanguage() {
    const t = translations[currentLanguage];
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const keys = key.split('.');
        let value = t;
        
        for (const k of keys) {
            value = value[k];
        }
        
        if (value) {
            element.textContent = value;
        }
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const keys = key.split('.');
        let value = t;
        
        for (const k of keys) {
            value = value[k];
        }
        
        if (value) {
            element.placeholder = value;
        }
    });
    
    // Update language toggle button
    const langBtn = document.getElementById('current-lang');
    if (langBtn) {
        langBtn.textContent = currentLanguage === 'en' ? '🇬🇧 EN' : '🇳🇱 NL';
    }
    
    // Save preference
    localStorage.setItem('language', currentLanguage);
}

// Toggle between languages
function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'nl' : 'en';
    updateLanguage();
    
    // Refresh current view if receipts are showing
    const receiptsContent = document.getElementById('receipts-content');
    if (receiptsContent && receiptsContent.style.display !== 'none') {
        // Check if we're viewing a receipt detail
        const backBtn = receiptsContent.querySelector('.back-button');
        if (backBtn && backBtn.style.display !== 'none') {
            // Get current receipt ID and reload it
            const receiptIdMatch = receiptsContent.innerHTML.match(/receipt-(\d+)/);
            if (receiptIdMatch) {
                viewReceipt(receiptIdMatch[1]);
            }
        } else {
            // Reload receipts list
            loadReceipts();
        }
    }
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 70;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Form submission handler
document.querySelector('.contact-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form values
    const name = this.querySelector('input[type="text"]').value;
    const email = this.querySelector('input[type="email"]').value;
    const message = this.querySelector('textarea').value;
    
    // In a real application, you would send this data to a server
    console.log('Form submitted:', { name, email, message });
    
    // Show success message
    alert('Thank you for your message! We will get back to you soon.');
    
    // Reset form
    this.reset();
});

// Add scroll effect to header
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        header.style.backgroundColor = '#1a252f';
    } else {
        header.style.backgroundColor = '#2c3e50';
    }
    
    lastScroll = currentScroll;
});

// CTA Button click handler
document.querySelector('.cta-button').addEventListener('click', function() {
    document.querySelector('#about').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
});

// ============================================
// Albert Heijn Purchase History Integration
// ============================================

let authUrl = '';

// Check login status on page load
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data.logged_in) {
            showReceiptsSection();
            await loadReceipts();
        } else {
            showLoginSection();
        }
    } catch (error) {
        console.error('Error checking login status:', error);
        showLoginSection();
    }
}

// Get authorization URL
async function getAuthUrl() {
    try {
        const response = await fetch('/api/authorize-url');
        if (!response.ok) {
            const text = await response.text();
            console.error('Failed to fetch /api/authorize-url:', response.status, text.substring(0, 500));
            authUrl = '';
            return;
        }
        const data = await response.json();
        authUrl = data.authorize_url || '';
        if (!authUrl) console.warn('authorize-url returned empty string');
    } catch (error) {
        console.error('Error getting auth URL:', error);
        authUrl = '';
    }
}

// Open authorization URL in new tab
document.getElementById('open-auth-btn')?.addEventListener('click', async function() {
    console.log('Login button clicked');
    // Make sure we have an authUrl; if not, fetch it on demand to avoid race conditions
    try {
        let win = null;

        if (!authUrl) {
            // Open a blank window synchronously to preserve the user gesture (avoid popup blocker)
            win = window.open('', '_blank', 'width=800,height=600');
            // Inform user in the new window while we fetch
            try {
                if (win) {
                    win.document.write('<p style="font-family: sans-serif; padding:20px;">Preparing login... please wait.</p>');
                }
            } catch (e) {
                // Ignore cross-origin write failures
            }

            console.log('No cached authorize URL, fetching...');
            await getAuthUrl();
        }

        if (authUrl) {
            // If we opened a blank window earlier, navigate it; otherwise open a new one
            if (win) {
                try { win.location = authUrl; } catch (e) { window.open(authUrl, '_blank', 'width=800,height=600'); }
            } else {
                window.open(authUrl, '_blank', 'width=800,height=600');
            }

            // Show helpful message
            setTimeout(() => {
                const step2 = document.querySelector('.step:nth-child(2)');
                if (step2) {
                    step2.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    step2.style.animation = 'pulse 2s ease-in-out';
                }
            }, 1000);
        } else {
            // Close the blank window if we opened one
            try { if (win) win.close(); } catch (e) {}
            showError('Failed to get authorization URL. Please try again.');
        }
    } catch (err) {
        console.error('Error opening auth URL:', err);
        showError('An unexpected error occurred while starting login. Check console for details.');
    }
});

// Auto-detect button - read from clipboard
document.getElementById('auto-detect-btn')?.addEventListener('click', async function() {
    const btnText = document.getElementById('btn-text');
    const originalText = btnText.textContent;
    
    try {
        // Request clipboard permission and read
        const clipboardText = await navigator.clipboard.readText();
        
        if (!clipboardText) {
            showError('Clipboard is empty. Please copy the redirect URL first.');
            return;
        }
        
        // Check if it looks like the redirect URL
        if (!clipboardText.includes('code=')) {
            showError('The clipboard doesn\'t contain a valid authorization URL. Please copy the appie://login-exit?code=... URL.');
            return;
        }
        
        btnText.textContent = '✓ Found code! Logging in...';
        
        // Extract code
        let code = '';
        if (clipboardText.includes('?code=')) {
            code = clipboardText.split('?code=')[1].split('&')[0];
        } else if (clipboardText.includes('code=')) {
            code = clipboardText.split('code=')[1].split('&')[0];
        }
        
        if (!code) {
            btnText.textContent = originalText;
            showError('Could not extract code from clipboard.');
            return;
        }
        
        // Submit the code
        showLoading();
        
        const formData = new FormData();
        formData.append('code', code);
        
        const response = await fetch('/api/login', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            hideLoading();
            btnText.textContent = '✓ Success!';
            showSuccess('Login successful! Loading your purchase history...');
            setTimeout(() => {
                hideSuccess();
                btnText.textContent = originalText;
            }, 3000);
            showReceiptsSection();
            await loadReceipts();
        } else {
            const error = await response.json();
            hideLoading();
            btnText.textContent = originalText;
            showError(error.detail || 'Login failed. Please try again.');
        }
        
    } catch (error) {
        btnText.textContent = originalText;
        
        if (error.name === 'NotAllowedError') {
            showError('Please allow clipboard access when prompted, then try again.');
        } else {
            showError('Could not read clipboard. Please use manual paste option below.');
            console.error('Clipboard error:', error);
        }
    }
});

// Handle login form submission - parse code from full URL
document.getElementById('login-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const urlInput = document.getElementById('auth-url').value.trim();
    
    if (!urlInput) {
        showError('Please paste the authorization code or URL');
        return;
    }
    
    // Extract code - very flexible parsing
    let code = '';
    try {
        // Check if it looks like a URL with code parameter
        if (urlInput.includes('?code=')) {
            code = urlInput.split('?code=')[1].split('&')[0];
        } else if (urlInput.includes('code=')) {
            code = urlInput.split('code=')[1].split('&')[0];
        } else if (urlInput.includes('://')) {
            // It's a URL but no code found
            showError('Could not find code in the URL. Please make sure the URL contains "?code=..."');
            return;
        } else {
            // Assume they pasted just the code directly
            code = urlInput;
        }
        
        if (!code) {
            showError('Could not extract authorization code. Please paste either the full URL or just the code.');
            return;
        }
        
        // Clean the code (remove any whitespace or special characters at the edges)
        code = code.trim();
        
    } catch (error) {
        showError('Error parsing the input. Please paste either the full appie://login-exit?code=... URL or just the code.');
        return;
    }
    
    showLoading();
    
    try {
        const formData = new FormData();
        formData.append('code', code);
        
        const response = await fetch('/api/login', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            hideLoading();
            showSuccess('Login successful! Loading your purchase history...');
            setTimeout(() => {
                hideSuccess();
            }, 3000);
            showReceiptsSection();
            await loadReceipts();
            document.getElementById('auth-url').value = '';
        } else {
            const error = await response.json();
            hideLoading();
            showError(error.detail || 'Login failed. The code may be invalid or expired. Please try logging in again.');
        }
    } catch (error) {
        hideLoading();
        showError('An error occurred during login. Please try again.');
        console.error('Login error:', error);
    }
});

// Load receipts
// Load receipts
async function loadReceipts() {
    showLoading();
    
    try {
        const response = await fetch('/api/receipts');
        
        if (!response.ok) {
            throw new Error('Failed to load receipts');
        }
        
        const data = await response.json();
        displayReceipts(data.receipts);
        hideLoading();
    } catch (error) {
        hideLoading();
        showError('Failed to load purchase history. Please try logging in again.');
        console.error('Error loading receipts:', error);
    }
}

// Display receipts
function displayReceipts(receipts) {
    const listElement = document.getElementById('receipts-list');
    
    if (!receipts || receipts.length === 0) {
        listElement.innerHTML = '<p class="no-receipts">No receipts found.</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'receipts-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Total</th>
                <th>Discount</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            ${receipts.map(receipt => {
                const date = new Date(receipt.transactionMoment).toLocaleDateString('nl-NL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const total = `€${receipt.total.amount.amount.toFixed(2)}`;
                const discount = receipt.totalDiscount ? `€${receipt.totalDiscount.amount.toFixed(2)}` : '€0.00';
                
                return `
                    <tr>
                        <td>${date}</td>
                        <td class="total">${total}</td>
                        <td class="discount">${discount}</td>
                        <td><button class="view-btn" data-id="${receipt.transactionId}">View Details</button></td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    
    listElement.innerHTML = '';
    listElement.appendChild(table);
    
    // Add click handlers for view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const transactionId = this.getAttribute('data-id');
            loadReceiptDetail(transactionId);
        });
    });
}

// Load receipt detail
async function loadReceiptDetail(transactionId) {
    showLoading();
    
    try {
        const response = await fetch(`/api/receipts/${transactionId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load receipt detail');
        }
        
        const data = await response.json();
        displayReceiptDetail(data);
        hideLoading();
    } catch (error) {
        hideLoading();
        showError('Failed to load receipt details.');
        console.error('Error loading receipt detail:', error);
    }
}

// Display receipt detail
function displayReceiptDetail(receipt) {
    const detailElement = document.getElementById('receipt-detail');
    const contentElement = document.getElementById('receipt-content');
    
    const date = new Date(receipt.transactionMoment).toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let itemsHtml = '';
    
    // Parse receiptUiItems to extract products
    if (receipt.receiptUiItems && receipt.receiptUiItems.length > 0) {
        const products = receipt.receiptUiItems.filter(item => {
            // Must be a product with description and amount
            if (item.type !== 'product' || !item.description || !item.amount) return false;
            
            // Filter out non-product items
            if (item.description.toUpperCase() === 'BONUSKAART') return false;
            if (item.description.toLowerCase().includes('waarvan')) return false;
            
            // Filter out discounts (negative amounts)
            const amount = parseFloat(item.amount.replace(',', '.'));
            if (amount < 0) return false;
            
            return true;
        });
        
        if (products.length > 0) {
            itemsHtml = `
                <div class="receipt-items">
                    <h4>Items Purchased</h4>
                    <div class="products-grid" id="products-grid">
                        ${products.map((item, index) => {
                            return `
                                <div class="product-card clickable" 
                                     data-product-index="${index}" 
                                     data-product-name="${item.description}" 
                                     data-product-price="${item.amount}"
                                     data-product-quantity="${item.quantity || '1'}"
                                     onclick="showProductDetails(${index})">
                                    <div class="product-image-placeholder">
                                        <span class="loading-spinner">Loading...</span>
                                    </div>
                                    <div class="product-info">
                                        <h5>${item.description}${item.indicator ? ` <span class="badge">${item.indicator}</span>` : ''}</h5>
                                        <p class="product-meta">Qty: ${item.quantity || '-'} | €${item.amount}</p>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        // After rendering, fetch product details
        setTimeout(() => enrichProductsWithDetails(products), 100);
    }
    
    // Extract discount information
    let discountAmount = '0.00';
    if (receipt.receiptUiItems) {
        const discountItem = receipt.receiptUiItems.find(item => item.label === 'UW VOORDEEL');
        if (discountItem && discountItem.price) {
            discountAmount = discountItem.price;
        }
    }
    
    // Extract total
    let totalAmount = '0.00';
    if (receipt.receiptUiItems) {
        const totalItem = receipt.receiptUiItems.find(item => item.label === 'TOTAAL');
        if (totalItem && totalItem.price) {
            totalAmount = totalItem.price;
        }
    }
    
    contentElement.innerHTML = `
        <div class="receipt-header-detail">
            <h3>Receipt Details</h3>
            <p class="receipt-date">${date}</p>
        </div>
        ${itemsHtml}
        <div class="receipt-summary">
            ${parseFloat(discountAmount) > 0 ? `
            <div class="summary-row discount">
                <span>Your Savings:</span>
                <span class="savings">€${discountAmount}</span>
            </div>
            ` : ''}
            <div class="summary-row total">
                <span><strong>Total Paid:</strong></span>
                <span><strong>€${totalAmount}</strong></span>
            </div>
        </div>
    `;
    
    document.getElementById('receipts-list').style.display = 'none';
    document.querySelector('.receipts-header').style.display = 'none';
    detailElement.style.display = 'block';
    
    // Scroll to top of receipt detail to prevent starting at bottom
    setTimeout(() => {
        detailElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// Back to receipts list
document.getElementById('back-to-list')?.addEventListener('click', function() {
    document.getElementById('receipt-detail').style.display = 'none';
    document.getElementById('receipts-list').style.display = 'block';
    document.querySelector('.receipts-header').style.display = 'flex';
    
    // Scroll to receipts section
    setTimeout(() => {
        document.getElementById('purchase-history').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
});

function PriceDifference({ productPrice, comparePrice, receiptIndicator, searchQuery, expand }) {
    // Returns an object { score, expand } where expand=true suggests
    // the caller may want to broaden the search if no good matches.
    let score = 0;
    if (comparePrice == null || productPrice == null) return { score: 0, expand: false };

    const priceDiff = Math.abs(productPrice - comparePrice);

    if (receiptIndicator && receiptIndicator.toUpperCase().includes('BONUS')) {
        // Tiered scoring for bonus items (lenient)
        if (priceDiff < 0.10) score += 500;
        else if (priceDiff < 0.20) score += 400;
        else if (priceDiff < 0.30) score += 300;
        else if (priceDiff < 0.50) score += 200;
        else if (priceDiff >0.50 && expand) return {score: score+=400, expand:true}; //logic works??
        else return { score, expand: true }; // Not close, must expand
        return { score, expand: false };
    }

    // Strict scoring for normal items
    if (priceDiff < 0.02) {
        score += 500; // strong reward for exact match
        return { score, expand: false };
    }

    // mismatch, must expand search
    else return {score, expand: true };
}

// Enrich products with images and details from product search API
async function enrichProductsWithDetails(products) {
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const card = document.querySelector(`[data-product-index="${i}"]`);
        
        if (!card) continue;
        
    // Get the receipt data for matching
    // Parse numeric fields robustly (receipt uses commas for decimals sometimes)
    const rawPriceStr = (card.getAttribute('data-product-price') || '').toString();
    const parsedPrice = parseFloat(rawPriceStr.replace(',', '.'));
    const rawQuantityStr = (card.getAttribute('data-product-quantity') || '1').toString();
    const parsedQuantity = parseFloat(rawQuantityStr.replace(',', '.')) || 1;
    // receiptPrice is the total line amount as present on receipt; compute unit price when quantity > 1
    const receiptPrice = Number.isFinite(parsedPrice) ? parsedPrice : null;
    const receiptQuantity = parsedQuantity;
    const receiptUnitPrice = (receiptPrice != null && receiptQuantity > 0) ? (receiptPrice / receiptQuantity) : receiptPrice;
    const receiptDescription = product.description;
    // Indicator (e.g. 'BONUS') — prefer using receipt item indicator when present
    const receiptIndicator = (product.indicator || '').toString();
    const expand=false;   
        try {
            // Clean up the product description for better search results
            // Keep the 'AH' prefix if present; the store prefixes AH to indicate AH-brand items
            let rawDesc = product.description || '';
            let searchQuery = rawDesc
                .replace(/BONUS/gi, '')  // Remove BONUS keyword
                .replace(/\d+\s*X\s*/gi, '') // Remove quantity multipliers (we handle quantity separately)
                .trim();
            // If the receipt explicitly prefixes 'AH', mark that this item requires AH-brand matching
            const AH = /^AH\b/i.test(rawDesc);
            
            // Skip certain non-product items
            if (searchQuery.toLowerCase().includes('pinnen') || 
                searchQuery.toLowerCase().includes('statiegeld') ||
                searchQuery.length < 3) {
                const placeholder = card.querySelector('.product-image-placeholder');
                placeholder.innerHTML = `<div class="no-image">💳</div>`;
                continue;
            }
            
            // Search for the product
            const response = await fetch(`/api/products/search?query=${encodeURIComponent(searchQuery)}`);
            
            if (!response.ok) {
                throw new Error('Search failed');
            }
            
            const data = await response.json();
            // If receipt prefix indicates AH-brand, filter search results to AH-brand candidates only.
            let candidates = data.products || [];
            if (AH) {
                const filtered = candidates.filter(p => {
                    const brand = (p.brand || '').toLowerCase();
                    const titleLower = (p.title || '').toLowerCase();
                    return brand.startsWith('ah') || titleLower.startsWith('ah ');
                });
                if (filtered.length > 0) {
                    candidates = filtered;
                } else {
                    // No AH-brand candidates found; fall back to original list but log for visibility
                    console.warn(`requiresAH=true but no AH-brand candidates found for "${searchQuery}", falling back to full results`);
                    candidates = data.products || [];
                }
            }
            else{
                const filtered = candidates.filter(p => {
                const brand = (p.brand || '').toLowerCase();
                const titleLower = (p.title || '').toLowerCase();
                return !brand.startsWith('ah') && !titleLower.startsWith('ah ');                });
                if (filtered.length > 0) {
                    candidates = filtered;
                } else {
                    // No AH-brand candidates found; fall back to original list but log for visibility
                    console.warn(`requiresAH=false but no non-AH-brand candidates found for "${searchQuery}", falling back to full results`);
                    candidates = data.products || [];
                }
            }
            
            // Score-based matching system for best product match
            if (data.products && data.products.length > 0) {
                
                // Scoring function: combines price, quantity, name, and description matching
                // pdScore is passed in from outside so we can also capture the `expand` flag
                // returned by PriceDifference when we map candidates.
                const scoreProduct = (apiProduct, score) => {
                    const title = apiProduct.title.toLowerCase();
                    const brand = (apiProduct.brand || '').toLowerCase();
                    const searchLower = searchQuery.toLowerCase();
                    const descLower = receiptDescription.toLowerCase();

                    const normalizeWords = (text) => text
                        .toLowerCase()
                        .replace(/[^a-z0-9\s]/g, ' ')
                        .split(/\s+/)
                        .filter(Boolean);
                    
                    const searchWords = searchLower.split(' ').filter(w => w.length > 2);
                    const descWords = descLower.replace(/bonus/gi, '').split(' ').filter(w => w.length > 3);
                    const searchWordSet = new Set(searchWords);
                    const descWordSet = new Set(descWords);
                    const titleWords = normalizeWords(title);
                    const stopWords = new Set(['dr', 'oetker', 'de', 'het', 'een', 'en', 'met', 'voor', 'van', 'verse', 'vers', 'original', 'classic', 'extra', 'pure', 'authentic', 'style', 'product', 'het']);

                    // 1. Price match
                    // If the receipt line is a BONUS item, allow a tiered scoring system.
                    // Otherwise be strict: only an (almost) exact match earns the strong price bonus,
                    // and non-matching prices are penalized to avoid false positives.
                    const productPrice = apiProduct.currentPrice ?? apiProduct.priceBeforeBonus ?? null;
                    // Use unit price for comparison when quantity > 1
                    const comparePrice = receiptUnitPrice != null ? receiptUnitPrice : receiptPrice;
                          // 2. Sales unit matches quantity (50 points)
                          // (pack-size matching code is currently commented out)
                    
                    // 3. Brand matching (60 points for exact match)
                    const originalDesc = receiptDescription.toUpperCase();
                    if (originalDesc.startsWith('AH BIOLOGISCH') && brand === 'ah biologisch') {
                        score += 60;
                    } else if (originalDesc.startsWith('AH BIO') && brand === 'ah biologisch') {
                        score += 60;
                    } else if (originalDesc.startsWith('AH TERRA') && brand === 'ah terra') {
                        score += 60;
                    }

                    // 4. Title contains search words (10 points each)
                    const matchedWords = Array.from(searchWordSet).filter(word => title.includes(word)).length;
                    score += matchedWords * 10;
                    
                    // 5. Penalty for excluded words (ingredients, dough, etc.)
                    const excludeWords = ['deeg', 'taartdeeg', 'dough', 'mix', 'poeder', 'powder', 'kruid', 'seasoning', 'basis'];
                    if (excludeWords.some(word => title.includes(word))) {
                        score -= 80;  // Heavy penalty
                    }
                    
                    // 6. Title similarity to full description (5 points each)
                    const titleMatchesDesc = Array.from(descWordSet).filter(word => title.includes(word)).length;
                    score += titleMatchesDesc * 5;

                    // 7. Subcategory alignment bonus
                    if (apiProduct.subCategory) {
                        const subLower = apiProduct.subCategory.toLowerCase();
                        const subMatches = Array.from(searchWordSet).filter(word => subLower.includes(word)).length;
                        score += subMatches * 25;
                        if (subMatches === 0 && searchWords.length === 1) {
                            score -= 15;
                        }
                    }

                    // 8. Penalize extra words that don't appear in receipt/search
                    const extraWords = titleWords.filter(word => word.length > 2 && !stopWords.has(word) && !searchWordSet.has(word) && !descWordSet.has(word));
                    score -= extraWords.length * 8;
                    
                    return score;
                };
                
                    // Score all products and find the best match. Call PriceDifference
                    // once per candidate and retain its `expand` suggestion so we can
                    // trigger expanded searches later if any candidate asks for it.
                    const comparePrice = receiptUnitPrice != null ? receiptUnitPrice : receiptPrice;
                    let scoredProducts = candidates.map(p => {
                        const productPrice = p.currentPrice ?? p.priceBeforeBonus ?? null;
                        const pd = PriceDifference({ productPrice, comparePrice, receiptIndicator, searchQuery });
                        const sc = scoreProduct(p, pd.score);
                        return { product: p, score: sc, expand: !!pd.expand };
                    });

                    // If any candidate suggested expansion (via PriceDifference.expand),
                    // allow the fallback-expansion logic to run even if the top score
                    // isn't strictly negative.
                    const shouldExpand = scoredProducts.some(s => s.expand === true);
                
                // Sort by score (highest first)
                scoredProducts.sort((a, b) => b.score - a.score);
                
                let bestMatch = scoredProducts[0];
                let productInfo = null;

                // If the top candidate score is negative OR PriceDifference suggested expansion,
                // try a fallback: expand category synonyms (e.g. "pasta" -> "tortelloni, ravioli")
                if (bestMatch && (bestMatch.score < 0 || shouldExpand) && searchQuery) {
                    // Simple category synonyms map — add more as we iterate
                    const categorySynonyms = {
                        'pasta': ['tortelloni', 'ravioli', 'lasagne', 'penne', 'spaghetti', 'tagliatelle'],
                        'brood': ['baguette', 'stokbrood', 'broodje', 'bolletje'],
                        'kaas': ['geraspte kaas', 'plakjes', 'kaasblok']
                    };

                    const lowerSearch = searchQuery.toLowerCase();
                    for (const key of Object.keys(categorySynonyms)) {
                        if (lowerSearch.includes(key)) {
                            // perform additional searches for synonyms and merge unique products
                            try {
                                const syns = categorySynonyms[key];
                                for (const s of syns) {
                                    const resp = await fetch(`/api/products/search?query=${encodeURIComponent(s)}`);
                                    if (!resp.ok) continue;
                                    const extra = await resp.json();
                                    const extraProducts = extra.products || [];
                                    // merge by webshopId if available, else by title
                                    const existingKeys = new Set(scoredProducts.map(sp => sp.product.webshopId || sp.product.title));
                                    for (const ep of extraProducts) {
                                            const k = ep.webshopId || ep.title;
                                            if (!existingKeys.has(k)) {
                                                const epPrice = ep.currentPrice ?? ep.priceBeforeBonus ?? null;
                                                const epPd = PriceDifference({ productPrice: epPrice, comparePrice, receiptIndicator, searchQuery });
                                                const epScore = scoreProduct(ep, epPd.score);
                                                scoredProducts.push({ product: ep, score: epScore, expand: !!epPd.expand });
                                                existingKeys.add(k);
                                            }
                                        }
                                }
                            } catch (err) {
                                console.warn('Fallback synonym search failed for', key, err);
                            }
                            break; // only trigger for first matching category
                        }
                    }

                    // Re-sort after adding extras
                    scoredProducts.sort((a, b) => b.score - a.score);
                    bestMatch = scoredProducts[0];
                }
                // Keep original unfiltered product list so we can fall back to it if needed
                const originalCandidates = data.products || [];

                // After any fallback, set productInfo to the chosen best match
                if (bestMatch) productInfo = bestMatch.product;

                // If the final best match has a negative score, do a broader fallback (search more variants / price-oriented)
                const searchPrice = (receiptUnitPrice != null && Number.isFinite(receiptUnitPrice)) ? receiptUnitPrice
                    : (receiptPrice != null && Number.isFinite(receiptPrice)) ? receiptPrice : null;
                if (bestMatch && bestMatch.score < 0 && searchQuery) {
                    const lowerSearch = searchQuery.toLowerCase();
                    // Broader synonyms for categories that often map to different product titles
                    const broaderSynonyms = {
                        'spinazie': ['spinazie', 'bladspinazie', 'verse spinazie', 'diepvries spinazie', 'spinazie 250g', 'spinazie 450g'],
                        'pasta': ['tortelloni', 'ravioli', 'lasagne', 'penne', 'spaghetti', 'tagliatelle', 'verse pasta'],
                        'salade': ['sla', 'voorgesneden sla', 'kropsla', 'ijsbergsla'],
                    };

                    for (const key of Object.keys(broaderSynonyms)) {
                        if (lowerSearch.includes(key)) {
                            try {
                                const syns = broaderSynonyms[key];
                                const existingKeys = new Set(scoredProducts.map(sp => sp.product.webshopId || sp.product.title));
                                for (const s of syns) {
                                    const resp = await fetch(`/api/products/search?query=${encodeURIComponent(s)}`);
                                    if (!resp.ok) continue;
                                    const extra = await resp.json();
                                    const extraProducts = extra.products || [];
                                    for (const ep of extraProducts) {
                                            const k = ep.webshopId || ep.title;
                                            if (!existingKeys.has(k)) {
                                                const epPrice = ep.currentPrice ?? ep.priceBeforeBonus ?? null;
                                                const epPd = PriceDifference({ productPrice: epPrice, comparePrice, receiptIndicator, searchQuery });
                                                const epScore = scoreProduct(ep, epPd.score);
                                                scoredProducts.push({ product: ep, score: epScore, expand: !!epPd.expand });
                                                existingKeys.add(k);
                                            }
                                        }
                                }
                            } catch (err) {
                                console.warn('Broader fallback search failed for', key, err);
                            }
                            break;
                        }
                    }

                    // Re-sort and pick best; but apply price-closest tie-breaker if scores are poor
                    scoredProducts.sort((a, b) => b.score - a.score);
                    // pick best by score first
                    bestMatch = scoredProducts[0];
                    // If multiple candidates have similar or negative scores, prefer the one closest in price
                    const pickBestByPrice = (list, price) => {
                        if (!price || !Number.isFinite(price)) return list[0];
                        // Consider top N candidates
                        const N = Math.min(10, list.length);
                        let bestIdx = 0;
                        let bestDiff = Infinity;
                        for (let i = 0; i < N; i++) {
                            const p = list[i].product;
                            const pPrice = p.currentPrice ?? p.priceBeforeBonus ?? null;
                            if (pPrice != null && Number.isFinite(pPrice)) {
                                const diff = Math.abs(pPrice - price);
                                if (diff < bestDiff) {
                                    bestDiff = diff;
                                    bestIdx = i;
                                }
                            }
                        }
                        return list[bestIdx];
                    };

                    // Use price-based selection when top score is negative or margin to next is small
                    if (bestMatch && (bestMatch.score < 0 || (scoredProducts.length > 1 && (bestMatch.score - scoredProducts[1].score) < 5))) {
                        const chosen = pickBestByPrice(scoredProducts, searchPrice);
                        if (chosen) bestMatch = chosen;
                        // ensure productInfo tracks bestMatch
                        if (bestMatch) productInfo = bestMatch.product;
                    }
                }

                // If we've filtered out AH-brand candidates earlier (when receipt didn't start with AH)
                // and the best match is still negative, fall back to the full original candidate set
                // (this handles cases like 'AH Biologisch Bladspinazie' being excluded)
                if (bestMatch && bestMatch.score < 0 && originalCandidates.length > 0 && originalCandidates.length !== candidates.length) {
                    try {
                        // Re-score the full original candidate set and pick the best
                        scoredProducts = originalCandidates.map(p => ({ product: p, score: scoreProduct(p) }));
                        scoredProducts.sort((a, b) => b.score - a.score);
                        bestMatch = scoredProducts[0];
                        if (bestMatch) productInfo = bestMatch.product;
                        console.warn('Falling back to original full candidate set due to negative score; new best:', bestMatch && bestMatch.product && bestMatch.product.title);
                    } catch (err) {
                        console.warn('Error when falling back to original candidates', err);
                    }
                }

                // Log top 5 candidates (useful for debugging mismatches)
                console.group(`Product match candidates for "${searchQuery}" (searchPrice: ${searchPrice != null ? '€' + searchPrice.toFixed(2) : 'N/A'}, qty: ${receiptQuantity || 1})`);
                const top = Math.min(5, scoredProducts.length);
                for (let r = 0; r < top; r++) {
                    const c = scoredProducts[r];
                    const p = c.product;
                    const pPrice = p.currentPrice ?? p.priceBeforeBonus ?? null;
                    const pPriceStr = (pPrice != null && Number.isFinite(pPrice)) ? '€' + pPrice.toFixed(2) : '-';
                    console.log(`${r+1}. (score: ${c.score}) ${p.title} | brand=${p.brand || '-'} | price=${pPriceStr} | sub=${p.subCategory || '-'} | unit=${p.salesUnitSize || '-'} `);
                }
                console.groupEnd();
                
                // Log chosen best match for visibility
                if (bestMatch) {
                    const chosenPrice = bestMatch.product.currentPrice ?? bestMatch.product.priceBeforeBonus ?? null;
                    console.log(`Chosen best match -> (score: ${bestMatch.score}) ${bestMatch.product.title} | price: ${chosenPrice != null ? '€' + chosenPrice.toFixed(2) : '-'} | sub=${bestMatch.product.subCategory || '-'} `);
                }

                // Ensure productInfo always matches the final bestMatch after all fallbacks.
                // If there's any discrepancy, overwrite and log it so we don't show the wrong image/info.
                if (bestMatch && bestMatch.product) {
                    if (!productInfo || productInfo.title !== bestMatch.product.title) {
                        console.warn('Overwriting productInfo to match final bestMatch:', productInfo && productInfo.title, '->', bestMatch.product.title, 'score', bestMatch.score);
                    }
                    productInfo = bestMatch.product;
                }

                // Debug: log the final productInfo chosen for the UI (title, score, images)
                try {
                    console.log('Final productInfo for UI:', productInfo && productInfo.title, 'finalScore:', bestMatch && bestMatch.score, 'images:', productInfo && productInfo.images && productInfo.images.length ? productInfo.images.map(i=>i.url).slice(0,3) : []);
                } catch (e) {
                    // ignore
                }

                // Find suitable image (200x200 or 400x400)
                let imageUrl = '';
                if (productInfo.images && productInfo.images.length > 0) {
                    const img = productInfo.images.find(img => img.width === 200) || 
                               productInfo.images.find(img => img.width === 400) ||
                               productInfo.images[0];
                    
                    // Use our proxy to avoid CORS issues
                    imageUrl = `/api/products/image?url=${encodeURIComponent(img.url)}`;
                }
                
                // Update the card with image and additional info
                const placeholder = card.querySelector('.product-image-placeholder');
                if (imageUrl) {
                    placeholder.innerHTML = `<img src="${imageUrl}" alt="${productInfo.title}" onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'>📦</div>'" />`;
                } else {
                    placeholder.innerHTML = `<div class="no-image">📦</div>`;
                }
                
                // Add more product info
                const infoDiv = card.querySelector('.product-info');
                if (productInfo.salesUnitSize) {
                    infoDiv.innerHTML += `<p class="product-size">${productInfo.salesUnitSize}</p>`;
                }
                
                // Add bonus indicator if applicable
                if (productInfo.discountType) {
                    infoDiv.innerHTML += `<p class="product-bonus">🏷️ Bonus</p>`;
                }
                
                // Store full product data for detail view
                card.setAttribute('data-product-data', JSON.stringify(productInfo));
            } else {
                // No product found, show placeholder
                const placeholder = card.querySelector('.product-image-placeholder');
                placeholder.innerHTML = `<div class="no-image">📦</div>`;
            }
        } catch (error) {
            console.error(`Error fetching product details for ${product.description}:`, error);
            const placeholder = card.querySelector('.product-image-placeholder');
            placeholder.innerHTML = `<div class="no-image">📦</div>`;
        }
    }
}

// Logout handler
document.getElementById('logout-btn')?.addEventListener('click', async function() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        showLoginSection();
    } catch (error) {
        console.error('Logout error:', error);
        showLoginSection();
    }
});

// UI Helper Functions
function showLoginSection() {
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('receipts-section').style.display = 'none';
}

function showReceiptsSection() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('receipts-section').style.display = 'block';
}

function showLoading() {
    document.getElementById('loading-message').style.display = 'block';
    hideError();
}

function hideLoading() {
    document.getElementById('loading-message').style.display = 'none';
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    hideLoading();
}

function hideError() {
    document.getElementById('error-message').style.display = 'none';
}

function showSuccess(message) {
    const successElement = document.getElementById('success-message');
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
    }
}

function hideSuccess() {
    const successElement = document.getElementById('success-message');
    if (successElement) {
        successElement.style.display = 'none';
    }
}

// Show product details in a modal
async function showProductDetails(index) {
    // Find the product card and get its stored data
    const card = document.querySelector(`[data-product-index="${index}"]`);
    if (!card) {
        console.error('Could not find card with index:', index);
        return;
    }
    
    const productDataStr = card.getAttribute('data-product-data');
    console.log('Product data for index', index, ':', productDataStr ? 'found' : 'missing');
    
    if (!productDataStr) {
        alert(translations[currentLanguage].modal.noInfo);
        return;
    }
    
    const product = JSON.parse(productDataStr);
    const t = translations[currentLanguage].modal;
    
    // Log product data to see nutrition structure
    console.log('Full product data:', product);
    
    // Helper function to safely handle arrays
    const toArray = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        return [value]; // Wrap single values in array
    };
    
    // Translate product text if in English mode
    let title = product.title;
    let descriptionFull = product.descriptionFull || '';
    let highlights = toArray(product.descriptionHighlights);
    
    if (currentLanguage === 'en') {
        // Show loading indicator
        const loadingModal = document.createElement('div');
        loadingModal.id = 'product-modal';
        loadingModal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-body" style="text-align: center; padding: 40px;">
                        <div class="loading-spinner" style="font-size: 2rem;">⌛</div>
                        <p>Translating product information...</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(loadingModal);
        
        // Translate all text fields
        try {
            title = await translateText(product.title, 'en');
            if (descriptionFull) {
                descriptionFull = await translateText(descriptionFull, 'en');
            }
            if (highlights.length > 0) {
                highlights = await Promise.all(
                    highlights.map(h => translateText(h, 'en'))
                );
            }
        } catch (error) {
            console.error('Translation error:', error);
        }
        
        // Remove loading modal
        loadingModal.remove();
    }
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal-overlay" onclick="closeProductModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="closeProductModal()">&times;</button>
                <div class="modal-body">
                    ${product.images && product.images.length > 0 ? 
                        `<img src="/api/products/image?url=${encodeURIComponent(product.images[0].url)}" 
                              alt="${title}" class="modal-image">` : ''}
                    <h2>${title}</h2>
                    ${product.brand ? `<p class="modal-brand"><strong>${t.brand}:</strong> ${product.brand.name}</p>` : ''}
                    ${product.salesUnitSize ? `<p class="modal-size"><strong>${t.size}:</strong> ${product.salesUnitSize}</p>` : ''}
                    ${product.priceBeforeBonus ? `<p class="modal-price"><strong>${t.price}:</strong> €${product.priceBeforeBonus.toFixed(2)}</p>` : 
                      product.currentPrice ? `<p class="modal-price"><strong>${t.price}:</strong> €${product.currentPrice.toFixed(2)}</p>` : ''}
                    
                    ${product.discountType ? `<p class="modal-bonus"><strong>${t.bonus}</strong></p>` : ''}
                    
                    ${product.propertyIcons && toArray(product.propertyIcons).length > 0 ? 
                        `<div class="modal-properties">
                            <strong>${t.properties}:</strong>
                            <div class="property-badges">
                                ${toArray(product.propertyIcons).map(icon => `<span class="property-badge">${typeof icon === 'string' ? icon : icon.text}</span>`).join('')}
                            </div>
                        </div>` : ''}
                    
                    ${highlights.length > 0 ? 
                        `<div class="modal-highlights">
                            <h3>${t.highlights}</h3>
                            <ul>
                                ${highlights.map(h => `<li>${h}</li>`).join('')}
                            </ul>
                        </div>` : ''}
                    
                    ${descriptionFull ? 
                        `<div class="modal-description">
                            <h3>${t.fullDescription}</h3>
                            <p>${descriptionFull}</p>
                        </div>` : ''}
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    const modalContainer = document.createElement('div');
    modalContainer.id = 'product-modal';
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
}

// Format nutritional information for display
function formatNutritionalInfo(nutritionData) {
    if (!nutritionData) return '<p>No nutritional information available</p>';
    
    console.log('Formatting nutrition data:', nutritionData);
    
    // Handle string format
    if (typeof nutritionData === 'string') {
        return `<p>${nutritionData}</p>`;
    }
    
    // Handle array format (AH API typically uses this)
    if (Array.isArray(nutritionData)) {
        let html = '<table class="nutrition-table">';
        html += '<thead><tr><th>Nutrient</th><th>Per 100g/ml</th></tr></thead>';
        html += '<tbody>';
        
        nutritionData.forEach(item => {
            // Handle different possible structures
            const name = item.name || item.nutrient || item.label || '';
            const value = item.value || item.amount || item.quantity || '';
            
            if (name && value) {
                html += `<tr><td>${name}</td><td>${value}</td></tr>`;
            }
        });
        
        html += '</tbody></table>';
        return html;
    }
    
    // Handle object with table property
    if (nutritionData.table) {
        return formatNutritionalInfo(nutritionData.table);
    }
    
    // Handle object with key-value pairs
    if (typeof nutritionData === 'object') {
        let html = '<table class="nutrition-table">';
        html += '<thead><tr><th>Nutrient</th><th>Value</th></tr></thead>';
        html += '<tbody>';
        
        Object.keys(nutritionData).forEach(key => {
            // Skip metadata fields
            if (['table', 'servingSize', 'servingsPerContainer'].includes(key)) return;
            
            const value = nutritionData[key];
            if (value !== null && value !== undefined) {
                // Format the key nicely
                const formattedKey = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase());
                    
                html += `<tr><td>${formattedKey}</td><td>${value}</td></tr>`;
            }
        });
        
        html += '</tbody></table>';
        return html;
    }
    
    // Fallback: show as formatted JSON
    return `<pre>${JSON.stringify(nutritionData, null, 2)}</pre>`;
}

// Close product details modal
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.remove();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateLanguage(); // Set initial language
    getAuthUrl();
    checkLoginStatus();
});

