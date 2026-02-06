import { csvParse, autoType } from "https://cdn.jsdelivr.net/npm/d3-dsv/+esm";

const response = await fetch("./data/example.csv");
const dataset = csvParse(await response.text(), autoType);

/** Loads flashcard progress from local storage if available. */
function loadProgress() {
	const stored = localStorage.getItem("flashcardProgress");
	return stored ? JSON.parse(stored) : {};
}

/** Saves the current progress back to local storage. */
function saveProgress(progress) {
	localStorage.setItem("flashcardProgress", JSON.stringify(progress));
}

// Sorts the flashcards by their due date to prioritise learning.
const progressData = loadProgress();
const cards = dataset
	.sort((a, b) => {
		// Put cards without a dueDate at the last
		const dateA = progressData[a.ID]?.dueDate ? new Date(progressData[a.ID].dueDate) : Infinity;
		const dateB = progressData[b.ID]?.dueDate ? new Date(progressData[b.ID].dueDate) : Infinity;
		return dateA - dateB;
	});

let currentIndex = 0;

const cardColorClasses = [
	"card-color-pink",
	"card-color-yellow",
	"card-color-blue",
	"card-color-purple",
	"card-color-orange",
];

const detailEmojiPool = [
	"🌟",
	"🌼",
	"🍀",
	"🎈",
	"🐣",
	"🍭",
	"✨",
	"😺",
	"📘",
	"🧠",
	"🎉",
	"🫶",
];

const sparkleEmojiPool = [
	"🌸",
	"💐",
	"💖",
	"🌺",
	"🪷",
	"🦋",
	"💞",
	"⭐",
];

const cardFrontFace = document.querySelector(".card-front");
const cardBackFace = document.querySelector(".card-back");
const cardSparkles = document.querySelectorAll(".card-sparkle");
const idiomElement = document.getElementById("idiom");
const idiomHighlightClasses = [
	"idiom-highlight-punch",
	"idiom-highlight-sun",
	"idiom-highlight-sea",
	"idiom-highlight-lilac",
	"idiom-highlight-mint",
];

function applyRandomCardColor() {
	if (!cardFrontFace || !cardBackFace) return;
	const nextColorClass = cardColorClasses[Math.floor(Math.random() * cardColorClasses.length)];
	for (const face of [cardFrontFace, cardBackFace]) {
		face.classList.remove(...cardColorClasses);
		face.classList.add(nextColorClass);
	}
}

function getRandomDetailEmoji() {
	return detailEmojiPool[Math.floor(Math.random() * detailEmojiPool.length)];
}

function setBackDetailText(elementId, value) {
	const element = document.getElementById(elementId);
	if (!element) return;
	const displayedValue = value ?? "";
	element.textContent = displayedValue ? `${getRandomDetailEmoji()} ${displayedValue}` : "";
}

function refreshSparkles() {
	for (const sparkle of cardSparkles) {
		sparkle.textContent = sparkleEmojiPool[Math.floor(Math.random() * sparkleEmojiPool.length)];
		sparkle.style.animationDelay = `${Math.random() * 2}s`;
		sparkle.style.animationDuration = `${5 + Math.random() * 2.5}s`;
	}
}

function applyIdiomHighlight() {
	if (!idiomElement) return;
	const nextHighlight = idiomHighlightClasses[Math.floor(Math.random() * idiomHighlightClasses.length)];
	idiomElement.classList.remove(...idiomHighlightClasses);
	idiomElement.classList.add(nextHighlight);
}

/** Creates a table row for each card, allowing quick navigation. */
function initEntries() {
	// Build table rows
	for (const [index, card] of cards.entries()) {
		const row = document.createElement("tr");
		row.addEventListener("click", () => {
			currentIndex = index;
			renderCard();
		});
		const cellId = document.createElement("td");
		cellId.textContent = card.ID;
		const cellWord = document.createElement("td");
		cellWord.textContent = card.Idiom;
		const cellDue = document.createElement("td");
		cellDue.textContent = progressData[card.ID]?.dueDate ?? "Unseen"; // If the card has not been learnt before, mark it as "Unseen"

		row.appendChild(cellId);
		row.appendChild(cellWord);
		row.appendChild(cellDue);
		document.getElementById("entries-body").appendChild(row);
	}
}

/** Updates highlighted row and due dates each time we render or change data. */
function updateEntries() {
	// Update row highlight and due dates
	for (const [index, card] of cards.entries()) {
		const row = document.getElementById("entries-body").children[index];
		row.classList.toggle("row-highlight", index === currentIndex);

		const cellDue = row.children[row.childElementCount - 1];
		const dueDateString = progressData[card.ID]?.dueDate;
		if (dueDateString) {
			cellDue.textContent = dueDateString;
			// If the due date is earlier than today, mark it as overdue
			const dueDate = new Date(dueDateString);
			const today = new Date();
			cellDue.classList.toggle("overdue-date", dueDate.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0));
		} else {
			cellDue.textContent = "Unseen";
			cellDue.classList.remove("overdue-date");
		}
	}
}

const transitionHalfDuration = parseFloat(getComputedStyle(document.getElementById("card-inner")).transitionDuration) * 1000 / 2;

/** Renders the current card on both front and back. */
function renderCard() {
	// STUDENTS: Start of recommended modifications
	// If there are more columns in the dataset (e.g., synonyms, example sentences),
	// display them here (e.g., document.getElementById("card-synonym").textContent = currentCard.synonym).

	// Reset flashcard to the front side
	document.getElementById("card-inner").dataset.side = "front";

	// Update the front side with the current card's word
	const currentCard = cards[currentIndex];
	applyRandomCardColor();
	refreshSparkles();
	if (idiomElement) {
		idiomElement.textContent = `${currentCard.Idiom} ${currentCard.Emoji || ""}`.trim();
	}
	applyIdiomHighlight();
	document.getElementById("category").textContent = currentCard.Category;
	
	const levelStars = { "Easy": "⭐", "Medium": "⭐⭐", "Hard": "⭐⭐⭐" };
	document.getElementById("level").textContent = levelStars[currentCard.Level] || currentCard.Level;

	const frontImage = document.getElementById("card-front-image");
	frontImage.src = currentCard.Image ?? "";
	frontImage.hidden = !currentCard.Image;
	document.getElementById("card-back-emoji").textContent = currentCard.Emoji || "🌈✨";

	// Wait for the back side to become invisible before updating the content on the back side
	setTimeout(() => {
		setBackDetailText("card-back-meaning", currentCard.Meaning);
		setBackDetailText("card-back-example", currentCard["Business Example"]);
		setBackDetailText("card-back-cantonese", currentCard["Cantonese Note"]);
		setBackDetailText("card-back-related", currentCard["Related Idiom"]);
	}, transitionHalfDuration);
	// STUDENTS: End of recommended modifications

	updateEntries();
}

// Toggle the entries list when the hamburger button in the heading is clicked
document.getElementById("toggle-entries").addEventListener("click", () => {
	document.getElementById("entries").hidden = !document.getElementById("entries").hidden;
});

// Flip the card when the card itself is clicked
document.getElementById("card-inner").addEventListener("click", event => {
	// Only flip the card when clicking on the underlying card faces, not any elements inside.
	// This line is unnecessary for other buttons.
	if (!event.target?.classList?.contains("card-face")) return;

	event.currentTarget.dataset.side = event.currentTarget.dataset.side === "front" ? "back" : "front";
});

/** Navigates to the previous card. */
function previousCard() {
	currentIndex = (currentIndex - 1 + cards.length) % cards.length;
}

/** Navigates to the next card. */
function nextCard() {
	currentIndex = (currentIndex + 1) % cards.length;
}

document.getElementById("btn-back").addEventListener("click", () => {
	previousCard();
	renderCard();
});
document.getElementById("btn-skip").addEventListener("click", () => {
	nextCard();
	renderCard();
});

/**
 * Mapping between the user's selection (Again, Good, Easy) and the number of days until the due date.
 */
const dayOffset = { again: 1, good: 3, easy: 7 };

/**
 * Records learning progress by updating the card's due date based on the user's selection (Again, Good, Easy).
 */
function updateDueDate(type) {
	const card = cards[currentIndex];
	const today = new Date();
	const dueDate = newIDate(today.setDate(today.getDate() + dayOffset[type]) - today.getTimezoneOffset() * 60 * 1000);
	(progressData[card.id] ??= {}).dueDate = dueDate.toISOString().split("T")[0]; // Print the date in YYYY-MM-DD format
	saveProgress(progressData);
	updateEntries();
}

document.getElementById("btn-again").addEventListener("click", () => {
	updateDueDate("again");
	nextCard();
	renderCard();
});
document.getElementById("btn-good").addEventListener("click", () => {
	updateDueDate("good");
	nextCard();
	renderCard();
});
document.getElementById("btn-easy").addEventListener("click", () => {
	updateDueDate("easy");
	nextCard();
	renderCard();
});

// Initial render
initEntries();
renderCard();
