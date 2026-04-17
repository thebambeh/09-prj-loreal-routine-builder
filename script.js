const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearSelectionsBtn = document.getElementById("clearSelectionsBtn");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const WORKER_URL = "https://loreal-chatbot.pram-wardhana12.workers.dev/";
const STORAGE_KEY = "loreal_selected_products";

let allProducts = [];
let filteredProducts = [];
let selectedProducts = [];
let routineGenerated = false;

const messages = [
  {
    role: "system",
    content: `
You are a L'Oréal routine builder assistant. Use the selected products and any generated routine context to answer clearly and helpfully. Stay focused on beauty, skincare, haircare, makeup, fragrance, grooming, and routine-related questions. If the user asks something unrelated, politely redirect them back to L'Oréal products or their routine. You can also search and surf related and relevant real products online. Only include links that you are confident are real and directly usable.
Do not invent, guess, or rewrite URLs.
Prefer official L'Oréal or brand product pages when available.
If you are not sure about a link, do not include it.
When giving links, output the full raw URL on its own line.

Before the routine, include 1 short positive sentence complimenting the user's product selection. Optionally include one short suggestion sentence if something is missing (like sunscreen or other product).

RULES for the compliment:
- One sentence only
- No emojis
- No markdown
- Keep it natural and short
- Do NOT add extra spacing after it

STRICT FORMAT RULES:
- Do NOT use #, *, markdown, or emojis
- Do NOT add extra spacing or empty lines
- Keep everything clean and consistent

FORMAT LOOKS LIKE THIS(ADJUST ACCORDINGLY AND RELEVANTLY):

[One short compliment or suggestion sentence]

Morning Routine (doesn't have to be evening or morning, adjust it accordingly to the product)
- Cleanser (adjust relevantly doesn't have to be cleanser all the time)
Product: ...
When: ...
Tip: ...

- Moisturizer (adjust relevantly doesn't have to be Moisturizer all the time)
Product: ...
When: ...
Tip: ...

...(add if the user have more products, adjust and order it relevantly)

Evening Routine (doesn't have to be evening or morning, adjust it accordingly to the product)
- Cleanser (adjust relevantly doesn't have to be cleanser all the time)
Product: ...
When: ...
Tip: ...

- Serum (adjust relevantly doesn't have to be serum all the time)
Product: ...
When: ...
Tip: ...

...(add if the user have more products, adjust and order it relevantly)

RULES:
- Routine titles must be plain text
- Each step must start with "- "
- No numbering like Step 1
- No extra headings or symbols
- Keep spacing tight
- Only output the routine

If the user asks for current products or web results, search the web and return:
- product name
- short reason it is relevant
- one verified live URL

Do not include dead, guessed, or approximate links.
    `,
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
  } catch {
    productsContainer.innerHTML = `<div class="placeholder-message">Could not load products right now.</div>`;
    return [];
  }
}

function applyFilters() {
  const category = categoryFilter.value;
  const query = productSearch.value.toLowerCase();

  filteredProducts = allProducts.filter((product) => {
    const matchCategory = !category || product.category === category;

    const matchSearch =
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query);

    return matchCategory && matchSearch;
  });

  displayProducts(filteredProducts);
}

function displayProducts(products) {
  if (!products.length) {
    productsContainer.innerHTML = `<div class="placeholder-message">No products found.</div>`;
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
          <button class="select-btn" data-action="toggle-select" data-name="${escapeAttribute(product.name)}">
            ${isSelected ? "Unselect" : "Select"}
          </button>

          <button class="desc-btn" data-action="toggle-description" data-name="${escapeAttribute(product.name)}">
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
      <button class="remove-chip-btn" data-remove-name="${escapeAttribute(product.name)}">
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
  return saved ? JSON.parse(saved) : [];
}

function toggleProductSelection(productName) {
  const product = allProducts.find((p) => p.name === productName);
  if (!product) return;

  const index = selectedProducts.findIndex((p) => p.name === productName);

  if (index >= 0) selectedProducts.splice(index, 1);
  else selectedProducts.push(product);

  saveSelectedProducts();
  displayProducts(filteredProducts);
  renderSelectedProducts();
}

function removeSelectedProduct(name) {
  selectedProducts = selectedProducts.filter((p) => p.name !== name);
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

function toggleDescription(name) {
  const el = document.getElementById(`desc-${slugify(name)}`);
  if (el) el.classList.toggle("open");
}

function addChatBubble(type, text) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${type}`;

  if (type === "user" || type === "error") {
    bubble.textContent = text;
  } else {
    bubble.innerHTML = linkifyText(text);
  }

  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function linkifyText(text) {
  let formatted = text
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    .replace(
      /(https?:\/\/[^\s)]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
    );

  formatted = formatted.replace(/\n/g, "<br>");
  return formatted;
}

categoryFilter.addEventListener("change", applyFilters);
productSearch.addEventListener("input", applyFilters);

productsContainer.addEventListener("click", (e) => {
  const selectBtn = e.target.closest('[data-action="toggle-select"]');
  const descBtn = e.target.closest('[data-action="toggle-description"]');

  if (selectBtn) toggleProductSelection(selectBtn.dataset.name);
  if (descBtn) toggleDescription(descBtn.dataset.name);
});

selectedProductsList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-name]");
  if (btn) removeSelectedProduct(btn.dataset.removeName);
});

clearSelectionsBtn.addEventListener("click", clearAllSelections);

generateRoutineBtn.addEventListener("click", async () => {
  if (!selectedProducts.length) {
    addChatBubble("error", "Select at least one product.");
    return;
  }

  generateRoutineBtn.disabled = true;

  const routinePrompt = `
Create a routine using ONLY the selected products.
Selected products:
${JSON.stringify(selectedProducts, null, 2)}
`;

  messages.push({ role: "user", content: routinePrompt });

  addChatBubble("user", "Generate my routine");

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    const data = await res.json();
    const reply = data.choices[0].message.content;

    messages.push({ role: "assistant", content: reply });
    addChatBubble("ai", reply);

    routineGenerated = true;
  } catch {
    addChatBubble("error", "Failed to generate routine.");
  }

  generateRoutineBtn.disabled = false;
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  if (!routineGenerated) {
    addChatBubble("error", "Generate a routine first.");
    return;
  }

  addChatBubble("user", text);
  userInput.value = "";
  sendBtn.disabled = true;

  messages.push({ role: "user", content: text });

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    const data = await res.json();
    const reply = data.choices[0].message.content;

    messages.push({ role: "assistant", content: reply });
    addChatBubble("ai", reply);
  } catch {
    addChatBubble("error", "Chat failed.");
  }

  sendBtn.disabled = false;
});

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function escapeAttribute(text) {
  return String(text).replace(/"/g, "&quot;");
}
