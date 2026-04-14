const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearSelectionsBtn = document.getElementById("clearSelectionsBtn");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const WORKER_URL = "https://loreal-chatbot-worker.pram-wardhana12.workers.dev/";
const STORAGE_KEY = "loreal_selected_products";

let allProducts = [];
let filteredProducts = [];
let selectedProducts = [];
let routineGenerated = false;

const messages = [
  {
    role: "system",
    content:
      "You are a L'Oréal routine builder assistant. Use the selected products and any generated routine context to answer clearly and helpfully. Stay focused on beauty, skincare, haircare, makeup, fragrance, grooming, and routine-related questions. If the user asks something unrelated, politely redirect them back to L'Oréal products or their routine.",
  },
];

initializeApp();

async function initializeApp() {
  addChatBubble(
    "ai",
    "Welcome to your L'Oréal Routine Builder. Choose products, generate a routine, and then ask follow-up questions about how to use them.",
  );

  allProducts = await loadProducts();
  selectedProducts = loadSelectedProducts();
  filteredProducts = [...allProducts];

  displayProducts(filteredProducts);
  renderSelectedProducts();
}

async function loadProducts() {
  try {
    const response = await fetch("products.json");
    const data = await response.json();
    return data.products;
  } catch (error) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">Could not load products right now.</div>
    `;
    return [];
  }
}

function displayProducts(products) {
  if (!products.length) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">No products found for this category.</div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some(
        (item) => item.name === product.name,
      );
      return `
        <div class="product-card ${isSelected ? "selected" : ""}" data-name="${escapeAttribute(product.name)}">
          <div class="product-top">
            <img src="${product.image}" alt="${escapeAttribute(product.name)}">
            <div class="product-info">
              <h3>${product.name}</h3>
              <p class="product-brand">${product.brand}</p>
              <p class="product-category">${product.category}</p>
            </div>
          </div>
          <div class="product-actions">
            <button class="select-btn" type="button" data-action="toggle-select" data-name="${escapeAttribute(product.name)}">
              ${isSelected ? "Unselect" : "Select"}
            </button>
            <button class="desc-btn" type="button" data-action="toggle-description" data-name="${escapeAttribute(product.name)}">
              Description
            </button>
          </div>
          <div class="product-description" id="desc-${slugify(product.name)}">
            ${product.description || "No description available."}
          </div>
        </div>
      `;
    })
    .join("");
}

function renderSelectedProducts() {
  if (!selectedProducts.length) {
    selectedProductsList.innerHTML = `<div class="empty-selected">No products selected yet.</div>`;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-chip">
          <span>${product.name}</span>
          <button class="remove-chip-btn" type="button" data-remove-name="${escapeAttribute(product.name)}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `,
    )
    .join("");
}

function saveSelectedProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts));
}

function loadSelectedProducts() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) return [];

  try {
    return JSON.parse(saved);
  } catch (error) {
    return [];
  }
}

function toggleProductSelection(productName) {
  const product = allProducts.find((item) => item.name === productName);

  if (!product) return;

  const existingIndex = selectedProducts.findIndex(
    (item) => item.name === productName,
  );

  if (existingIndex >= 0) selectedProducts.splice(existingIndex, 1);
  else selectedProducts.push(product);

  saveSelectedProducts();
  displayProducts(filteredProducts);
  renderSelectedProducts();
}

function removeSelectedProduct(productName) {
  selectedProducts = selectedProducts.filter(
    (item) => item.name !== productName,
  );
  saveSelectedProducts();
  displayProducts(filteredProducts);
  renderSelectedProducts();
}

function clearAllSelections() {
  selectedProducts = [];
  saveSelectedProducts();
  displayProducts(filteredProducts);
  renderSelectedProducts();
}

function toggleDescription(productName) {
  const descriptionEl = document.getElementById(`desc-${slugify(productName)}`);

  if (!descriptionEl) return;

  descriptionEl.classList.toggle("open");
}

function addChatBubble(type, text) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${type}`;
  bubble.textContent = text;
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

categoryFilter.addEventListener("change", (e) => {
  const selectedCategory = e.target.value;

  if (!selectedCategory) filteredProducts = [...allProducts];
  else
    filteredProducts = allProducts.filter(
      (product) => product.category === selectedCategory,
    );

  displayProducts(filteredProducts);
});

productsContainer.addEventListener("click", (e) => {
  const toggleSelectBtn = e.target.closest('[data-action="toggle-select"]');
  const toggleDescriptionBtn = e.target.closest(
    '[data-action="toggle-description"]',
  );

  if (toggleSelectBtn) {
    toggleProductSelection(toggleSelectBtn.dataset.name);
    return;
  }

  if (toggleDescriptionBtn) {
    toggleDescription(toggleDescriptionBtn.dataset.name);
  }
});

selectedProductsList.addEventListener("click", (e) => {
  const removeBtn = e.target.closest("[data-remove-name]");

  if (!removeBtn) return;

  removeSelectedProduct(removeBtn.dataset.removeName);
});

clearSelectionsBtn.addEventListener("click", () => {
  clearAllSelections();
});

generateRoutineBtn.addEventListener("click", async () => {
  if (!selectedProducts.length) {
    addChatBubble(
      "error",
      "Please select at least one product before generating a routine.",
    );
    return;
  }

  generateRoutineBtn.disabled = true;

  const selectedProductData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  const routinePrompt = `
Create a clear personalized beauty routine using only these selected L'Oréal-related products.
For each product, explain when to use it, what step it belongs to, and give a short practical tip.
Keep the routine easy to follow and organized by order of use.

Selected products:
${JSON.stringify(selectedProductData, null, 2)}
  `.trim();

  messages.push({
    role: "user",
    content: routinePrompt,
  });

  addChatBubble("user", "Generate a routine using my selected products.");

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      addChatBubble(
        "error",
        data.error || "Could not generate a routine right now.",
      );
      generateRoutineBtn.disabled = false;
      return;
    }

    const reply = data.choices[0].message.content;

    messages.push({
      role: "assistant",
      content: reply,
    });

    addChatBubble("ai", reply);
    routineGenerated = true;
  } catch (error) {
    addChatBubble("error", "There was a problem generating your routine.");
  }

  generateRoutineBtn.disabled = false;
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userText = userInput.value.trim();

  if (!userText) return;

  if (!routineGenerated) {
    addChatBubble(
      "error",
      "Generate a routine first, then ask follow-up questions about it.",
    );
    userInput.value = "";
    return;
  }

  addChatBubble("user", userText);
  userInput.value = "";
  sendBtn.disabled = true;

  messages.push({
    role: "user",
    content: userText,
  });

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      addChatBubble(
        "error",
        data.error || "Could not answer that question right now.",
      );
      sendBtn.disabled = false;
      return;
    }

    const reply = data.choices[0].message.content;

    messages.push({
      role: "assistant",
      content: reply,
    });

    addChatBubble("ai", reply);
  } catch (error) {
    addChatBubble("error", "There was a problem continuing the chat.");
  }

  sendBtn.disabled = false;
});

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function escapeAttribute(text) {
  return String(text).replace(/"/g, "&quot;");
}
