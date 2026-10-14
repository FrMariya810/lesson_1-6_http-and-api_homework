"use strict";

const API_URL = "http://localhost:3000/books";
const REQUEST_TIMEOUT_MS = 8000;

const endpointLabel = document.querySelector('[data-ui="endpoint"]');
const statusEl = document.querySelector('[data-ui="status"]');
const statusTitle = statusEl.querySelector(".status__title");
const statusText = statusEl.querySelector(".status__text");
const collectionEl = document.querySelector('[data-ui="collection"]');
const collectionStatus = document.querySelector('[data-ui="collection-status"]');
const emptyEl = document.querySelector('[data-ui="empty"]');
const bookForm = document.querySelector('[data-form="entry"]');
const submitButton = document.querySelector('[data-action="submit"]');
const cancelEditButton = document.querySelector('[data-action="cancel-edit"]');
const submitStatus = document.querySelector('[data-ui="submit-status"]');
const formEyebrow = document.querySelector('[data-ui="form-eyebrow"]');
const formTitle = document.querySelector('[data-ui="form-title"]');
const reloadButton = document.querySelector('[data-action="reload"]');

const STATE = {
  LOADING: "loading",
  SUCCESS: "success",
  EMPTY: "empty",
  ERROR: "error",
};

const FORM_MODES = {
  CREATE: {
    eyebrow: "Новая запись",
    title: "Добавить книгу",
    submit: "Отправить в API",
  },
  EDIT: {
    eyebrow: "Редактирование",
    title: "Изменить книгу",
    submit: "Сохранить изменения",
  },
};

const MESSAGES = {
  loading: { title: "Загрузка", text: "Запрашиваем книги у сервера…" },
  empty: { title: "Пусто", text: "Сервер вернул пустой список." },
  error: { title: "Ошибка", text: "Не удалось загрузить книги. Проверьте, что API запущен, и нажмите «Обновить»." },
  timeout: {
    title: "Тайм-аут",
    text: `Сервер не ответил за ${REQUEST_TIMEOUT_MS / 1000} секунд. Проверьте соединение и нажмите «Обновить».`,
  },
  submitting: "Отправляем книгу…",
  submitError: "Не удалось отправить книгу. Данные в форме сохранены, попробуйте ещё раз.",
  submitTimeout: `Тайм-аут: сервер не ответил за ${REQUEST_TIMEOUT_MS / 1000} секунд. Данные в форме сохранены, попробуйте ещё раз.`,
  submitOk: "Книга добавлена!",
  saving: "Сохраняем изменения…",
  saveError: "Не удалось сохранить изменения. Данные в форме сохранены, попробуйте ещё раз.",
  saveTimeout: `Тайм-аут при сохранении: сервер не ответил за ${REQUEST_TIMEOUT_MS / 1000} секунд. Данные в форме сохранены, попробуйте ещё раз.`,
  saveOk: "Книга обновлена!",
  deleteConfirm: (title) => `Удалить книгу «${title}»?`,
  deleting: (title) => `Удаляем «${title}»…`,
  deleteOk: (id) => `Книга удалена. Номер: #${id}`,
  deleteError: (title) => `Не удалось удалить «${title}». Карточка возвращена, попробуйте ещё раз.`,
  deleteTimeout: (title) => `Тайм-аут при удалении «${title}»: сервер не ответил за ${REQUEST_TIMEOUT_MS / 1000} секунд. Карточка возвращена.`,
  deletePending: "Удаление этой книги уже выполняется.",
  editStarted: (id) => `Редактирование книги #${id}. Измените поля и нажмите «Сохранить».`,
  editCancelled: "Редактирование отменено.",
};

let currentBooks = [];
let editingId = null;

const pendingDeletes = new Set();

function isTimeoutError(error) {
  return error instanceof DOMException && error.name === "TimeoutError";
}

async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException("Timeout", "TimeoutError"));
  }, timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

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

function setSubmitStatus(text, variant = "info") {
  submitStatus.textContent = text;
  submitStatus.dataset.state = variant;
}

function setCollectionStatus(text, variant = "info") {
  collectionStatus.textContent = text;
  collectionStatus.dataset.state = variant;
}

function applyFormMode(mode) {
  formEyebrow.textContent = mode.eyebrow;
  formTitle.textContent = mode.title;
  submitButton.textContent = mode.submit;
  cancelEditButton.hidden = mode === FORM_MODES.CREATE;
}

function renderBooks(books) {
  collectionEl.replaceChildren();

  books.forEach((book) => {
    const card = document.createElement("article");
    card.className = "book-card";
    if (String(book.id) === String(editingId)) {
      card.classList.add("book-card--editing");
    }

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

    const actions = document.createElement("div");
    actions.className = "book-card__actions";

    const editButton = document.createElement("button");
    editButton.className = "button button--secondary";
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.dataset.id = String(book.id);
    editButton.textContent = "Редактировать";

    const deleteButton = document.createElement("button");
    deleteButton.className = "button button--danger";
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = String(book.id);
    deleteButton.textContent = "Удалить";

    actions.append(editButton, deleteButton);

    heading.append(title, id);
    card.append(heading, author, meta, badge, actions);
    collectionEl.append(card);
  });
}

function buildBookPayload(formData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    author: String(formData.get("author") ?? "").trim(),
    genre: String(formData.get("genre") ?? "").trim(),
    year: Number(formData.get("year")),
    available: formData.get("available") === "on",
  };
}

function fillFormWithBook(book) {
  bookForm.elements.title.value = book.title;
  bookForm.elements.author.value = book.author;
  bookForm.elements.genre.value = book.genre;
  bookForm.elements.year.value = book.year;
  bookForm.elements.available.checked = Boolean(book.available);
}

function startEdit(id) {
  const book = currentBooks.find((item) => String(item.id) === String(id));
  if (!book) {
    return;
  }

  editingId = book.id;

  fillFormWithBook(book);
  applyFormMode(FORM_MODES.EDIT);
  setSubmitStatus(MESSAGES.editStarted(book.id));

  renderBooks(currentBooks);

  bookForm.scrollIntoView({ behavior: "smooth", block: "start" });
  bookForm.elements.title.focus();
}

function cancelEdit() {
  editingId = null;
  bookForm.reset();
  applyFormMode(FORM_MODES.CREATE);
  setSubmitStatus(MESSAGES.editCancelled);

  if (currentBooks.length > 0) {
    renderBooks(currentBooks);
  }
}

async function loadBooks() {
  setState(STATE.LOADING, MESSAGES.loading);
  reloadButton.disabled = true;

  try {
    const response = await fetchWithTimeout(API_URL, { method: "GET" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const books = await response.json();
    currentBooks = books;

    if (books.length === 0) {
      setState(STATE.EMPTY, MESSAGES.empty);
      return;
    }

    renderBooks(books);
    setState(STATE.SUCCESS, {
      title: "Готово",
      text: `Загружено книг: ${books.length}`,
    });
  } catch (error) {
    console.error("Не удалось загрузить книги", error);

    if (isTimeoutError(error)) {
      setState(STATE.ERROR, MESSAGES.timeout);
      return;
    }

    setState(STATE.ERROR, MESSAGES.error);
  } finally {
    reloadButton.disabled = false;
  }
}

async function deleteBook(id, button) {
  const key = String(id);

  if (pendingDeletes.has(key)) {
    setCollectionStatus(MESSAGES.deletePending, "info");
    return;
  }

  const book = currentBooks.find((item) => String(item.id) === key);
  if (!book) {
    return;
  }

  if (!confirm(MESSAGES.deleteConfirm(book.title))) {
    return;
  }

  const snapshot = currentBooks.slice();
  const removedTitle = book.title;

  pendingDeletes.add(key);
  if (button) {
    button.disabled = true;
  }

  currentBooks = currentBooks.filter((item) => String(item.id) !== key);
  renderBooks(currentBooks);
  setCollectionStatus(MESSAGES.deleting(removedTitle));

  try {
    const response = await fetchWithTimeout(`${API_URL}/${id}`, { method: "DELETE" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (String(editingId) === key) {
      cancelEdit();
    }

    setCollectionStatus(MESSAGES.deleteOk(key), "success");
  } catch (error) {
    console.error("Не удалось удалить книгу", error);

    currentBooks = snapshot;
    renderBooks(currentBooks);

    const text = isTimeoutError(error)
      ? MESSAGES.deleteTimeout(removedTitle)
      : MESSAGES.deleteError(removedTitle);
    setCollectionStatus(text, "error");
  } finally {
    pendingDeletes.delete(key);

    const freshButton = collectionEl.querySelector(
      `button[data-action="delete"][data-id="${key}"]`
    );
    if (freshButton) {
      freshButton.disabled = false;
    }
  }
}

endpointLabel.textContent = API_URL;

reloadButton.addEventListener("click", loadBooks);

collectionEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const id = button.dataset.id;
  if (!id) {
    return;
  }

  if (button.dataset.action === "edit") {
    startEdit(id);
  }

  if (button.dataset.action === "delete") {
    deleteBook(id, button);
  }
});

cancelEditButton.addEventListener("click", cancelEdit);

bookForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!bookForm.checkValidity()) {
    bookForm.reportValidity();
    return;
  }

  const formData = new FormData(bookForm);
  const book = buildBookPayload(formData);

  const isEdit = editingId !== null;
  const url = isEdit ? `${API_URL}/${editingId}` : API_URL;
  const method = isEdit ? "PATCH" : "POST";

  submitButton.disabled = true;
  cancelEditButton.disabled = true;
  setSubmitStatus(isEdit ? MESSAGES.saving : MESSAGES.submitting);

  try {
    const response = await fetchWithTimeout(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(book),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const savedBook = await response.json();
    console.log(isEdit ? "Updated:" : "Created:", savedBook);

    if (isEdit) {
      setSubmitStatus(`${MESSAGES.saveOk} Номер: #${savedBook.id}`, "success");
      editingId = null;
      bookForm.reset();
      applyFormMode(FORM_MODES.CREATE);
    } else {
      bookForm.reset();
      setSubmitStatus(`${MESSAGES.submitOk} Номер: #${savedBook.id}`, "success");
    }

    await loadBooks();
  } catch (error) {
    console.error("Не удалось сохранить книгу", error);

    let text;
    if (isTimeoutError(error)) {
      text = isEdit ? MESSAGES.saveTimeout : MESSAGES.submitTimeout;
    } else {
      text = isEdit ? MESSAGES.saveError : MESSAGES.submitError;
    }
    setSubmitStatus(text, "error");
  } finally {
    submitButton.disabled = false;
    cancelEditButton.disabled = false;
  }
});

loadBooks();