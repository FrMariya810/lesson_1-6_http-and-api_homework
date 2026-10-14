// Стартовая точка домашней работы.
// Спроектируйте модель ресурса, запросы и состояния самостоятельно.

console.log('API storefront starter is ready');
"use strict";

const API_URL = "http://localhost:3000/books";

const endpointLabel = document.querySelector('[data-ui="endpoint"]');
const collectionEl  = document.querySelector('[data-ui="collection"]');
const reloadButton  = document.querySelector('[data-action="reload"]');

function renderBooks(books) {
  collectionEl.replaceChildren();

  books.forEach((book) => {
    const card = document.createElement("article");
    card.className = "book-card";

    const title = document.createElement("h3");
    title.className = "book-card__title";
    title.textContent = book.title;

    const author = document.createElement("p");
    author.className = "book-card__author";
    author.textContent = book.author;

    const meta = document.createElement("p");
    meta.className = "book-card__meta";
    meta.textContent = `${book.genre} · ${book.year}`;

    const badge = document.createElement("span");
    badge.className = "book-card__badge";
    badge.textContent = book.available ? "В наличии" : "Выдана";

    card.append(title, author, meta, badge);
    collectionEl.append(card);
  });
}

async function loadBooks() {
  try {
    const response = await fetch(API_URL, { method: "GET" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const books = await response.json();

    renderBooks(books);
  } catch (error) {
    console.error("Не удалось загрузить книги", error);
  }
}

endpointLabel.textContent = API_URL;

reloadButton.addEventListener("click", loadBooks);

loadBooks();