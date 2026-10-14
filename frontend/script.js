// Стартовая точка домашней работы.
// Спроектируйте модель ресурса, запросы и состояния самостоятельно.

console.log('API storefront starter is ready');
"use strict";

const API_URL = "http://localhost:3000/books";

const endpointLabel = document.querySelector('[data-ui="endpoint"]');
const statusEl = document.querySelector('[data-ui="status"]');
const statusTitle = statusEl.querySelector(".status__title");
const statusText = statusEl.querySelector(".status__text");
const collectionEl = document.querySelector('[data-ui="collection"]');
const emptyEl = document.querySelector('[data-ui="empty"]');
const reloadButton = document.querySelector('[data-action="reload"]');

const STATE = {
  LOADING: "loading",
  SUCCESS: "success",
  EMPTY: "empty",
  ERROR: "error",
};

function setState(state, { title = "", text = "" } = {}) {
  statusEl.dataset.state = state;
  statusTitle.textContent = title;
  statusText.textContent = text;

  const showStatus = state === STATE.LOADING || state === STATE.ERROR;
  statusEl.hidden = !showStatus;

  collectionEl.hidden = state !== STATE.SUCCESS;
  emptyEl.hidden = state !== STATE.EMPTY;

  statusEl.classList.toggle("status--loading", state === STATE.LOADING);
  statusEl.classList.toggle("status--error",   state === STATE.ERROR);
}

function renderBooks(books) {
  collectionEl.replaceChildren();

  books.forEach((book) => {
    const card = document.createElement("article");
    card.className = "book-card";

    const heading = document.createElement("div");
    heading.className = "book-card__heading";
    
    const id = document.createElement("span");
    id.className = "book-card__id";
    id.textContent = `#${book.id}`;

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
        if (!book.available) {
        badge.classList.add("book-card__badge--unavailable");
    }  

    heading.append(title, id);
    card.append(heading, author, meta, badge);
    collectionEl.append(card);
  });
}

async function loadBooks() {
  setState(STATE.LOADING, {
    title: "Загрузка",
    text: "Запрашиваем книги у сервера…",
  });
  reloadButton.disabled = true;

  try {
    const response = await fetch(API_URL, { method: "GET" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const books = await response.json();

    if (books.length === 0) {
      setState(STATE.EMPTY, {
        title: "Пусто",
        text: "Сервер вернул пустой список.",
      });
      return;
    }

    renderBooks(books);
    setState(STATE.SUCCESS, {
      title: "Готово",
      text: `Загружено книг: ${books.length}`,
    });
  } catch (error) {
    console.error("Не удалось загрузить книги", error);
    setState(STATE.ERROR, {
      title: "Ошибка",
      text: "Не удалось загрузить книги. Проверьте, что API запущен, и нажмите «Обновить».",
    });
  } finally {
    reloadButton.disabled = false;
  }
}

endpointLabel.textContent = API_URL;

reloadButton.addEventListener("click", loadBooks);

loadBooks();