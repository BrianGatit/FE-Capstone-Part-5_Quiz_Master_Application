

// ========================================
// STATE MANAGEMENT
// ========================================
let categories = [];
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let answers = [];
let selectedAnswer = null;
let quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');

// ========================================
// DOM ELEMENTS
// ========================================
const homeScreen = document.getElementById('homeScreen');
const quizScreen = document.getElementById('quizScreen');
const resultsScreen = document.getElementById('resultsScreen');
const historyCard = document.getElementById('historyCard');
const categorySelect = document.getElementById('category');
const difficultySelect = document.getElementById('difficulty');
const amountSelect = document.getElementById('amount');
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const exitBtn = document.getElementById('exitBtn');
const retakeBtn = document.getElementById('retakeBtn');
const homeBtn = document.getElementById('homeBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const errorMessage = document.getElementById('errorMessage');

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Decode HTML entities in a string
 * @param {string} html - HTML encoded string
 * @returns {string} Decoded string
 */
function decodeHTML(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Show a specific screen and hide others
 * @param {HTMLElement} screen - Screen element to show
 */
function showScreen(screen) {
    homeScreen.classList.add('hidden');
    quizScreen.classList.add('hidden');
    resultsScreen.classList.add('hidden');
    screen.classList.remove('hidden');
}

/**
 * Display an error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

/**
 * Hide the error message
 */
function hideError() {
    errorMessage.classList.add('hidden');
}

// ========================================
// API FUNCTIONS
// ========================================

/**
 * Fetch available quiz categories from the API
 */
async function fetchCategories() {
    try {
        const response = await fetch('https://opentdb.com/api_category.php');
        const data = await response.json();
        categories = data.trivia_categories;
        
        // Populate category dropdown
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        showError('Failed to load categories. Please refresh the page.');
    }
}

/**
 * Fetch quiz questions from the API
 */
async function fetchQuestions() {
    const category = categorySelect.value;
    const difficulty = difficultySelect.value;
    const amount = amountSelect.value;

    // Build API URL
    let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
    if (category) url += `&category=${category}`;
    if (difficulty) url += `&difficulty=${difficulty}`;

    try {
        startBtn.disabled = true;
        startBtn.textContent = 'Loading...';
        hideError();

        const response = await fetch(url);
        const data = await response.json();

        if (data.response_code === 0) {
            // Format questions with shuffled answers
            questions = data.results.map(q => ({
                ...q,
                answers: shuffleArray([...q.incorrect_answers, q.correct_answer])
            }));
            startQuiz();
        } else {
            showError('No questions available for this configuration. Try different settings.');
        }
    } catch (error) {
        console.error('Error fetching questions:', error);
        showError('Failed to load questions. Please check your internet connection.');
    } finally {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Quiz';
    }
}

// ========================================
// QUIZ FUNCTIONS
// ========================================

/**
 * Start the quiz
 */
function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    answers = [];
    showScreen(quizScreen);
    displayQuestion();
}

/**
 * Display the current question
 */
function displayQuestion() {
    const question = questions[currentQuestionIndex];
    selectedAnswer = null;

    // Update question number and score
    document.getElementById('questionNumber').textContent = 
        `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    document.getElementById('scoreBadge').textContent = `Score: ${score}`;
    
    // Update progress bar
    document.getElementById('progressFill').style.width = 
        `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
    
    // Display question text
    document.getElementById('questionText').textContent = decodeHTML(question.question);

    // Display answer options
    const answersContainer = document.getElementById('answers');
    answersContainer.innerHTML = '';

    question.answers.forEach((answer, index) => {
        const button = document.createElement('button');
        button.className = 'answer-btn';
        button.textContent = decodeHTML(answer);
        button.onclick = () => selectAnswer(answer, button);
        answersContainer.appendChild(button);
    });

    // Hide feedback and next button
    document.getElementById('feedback').classList.add('hidden');
    nextBtn.classList.add('hidden');
}

/**
 * Handle answer selection
 * @param {string} answer - Selected answer
 * @param {HTMLElement} button - Button element that was clicked
 */
function selectAnswer(answer, button) {
    if (selectedAnswer) return; // Prevent multiple selections

    selectedAnswer = answer;
    const question = questions[currentQuestionIndex];
    const isCorrect = answer === question.correct_answer;

    // Update score and button styling
    if (isCorrect) {
        score++;
        button.classList.add('correct');
        showFeedback('✓ Correct!', true);
    } else {
        button.classList.add('incorrect');
        showFeedback(`✗ Incorrect! Correct answer: ${decodeHTML(question.correct_answer)}`, false);
        
        // Highlight the correct answer
        const buttons = document.querySelectorAll('.answer-btn');
        buttons.forEach(btn => {
            if (btn.textContent === decodeHTML(question.correct_answer)) {
                btn.classList.add('correct');
            }
        });
    }

    // Save answer for review
    answers.push({
        question: question.question,
        selected: answer,
        correct: question.correct_answer,
        isCorrect
    });

    // Disable all answer buttons
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.disabled = true;
    });

    // Show next button
    nextBtn.classList.remove('hidden');
}

/**
 * Show feedback message
 * @param {string} message - Feedback message
 * @param {boolean} isCorrect - Whether the answer was correct
 */
function showFeedback(message, isCorrect) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.className = isCorrect ? 'feedback correct' : 'feedback incorrect';
    feedback.classList.remove('hidden');
}

/**
 * Move to the next question or show results
 */
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    } else {
        showResults();
    }
}

// ========================================
// RESULTS FUNCTIONS
// ========================================

/**
 * Display quiz results
 */
function showResults() {
    const percentage = Math.round((score / questions.length) * 100);
    const categoryName = categorySelect.options[categorySelect.selectedIndex].text;
    const difficulty = difficultySelect.value;

    // Save quiz to history
    const quizData = {
        date: new Date().toISOString(),
        category: categoryName,
        difficulty: difficulty,
        score: score,
        total: questions.length,
        percentage: percentage
    };
    quizHistory.push(quizData);
    localStorage.setItem('quizHistory', JSON.stringify(quizHistory));

    // Display final score
    document.getElementById('finalScore').textContent = `${percentage}%`;
    
    // Display score text with performance message
    let performanceMessage = '';
    if (percentage >= 90) performanceMessage = '🎉 Outstanding! You\'re a genius!';
    else if (percentage >= 80) performanceMessage = ' Excellent work! You\'re a quiz master!';
    else if (percentage >= 70) performanceMessage = 'Great job! Keep it up!';
    else if (percentage >= 60) performanceMessage = 'Good effort! You\'re doing well!';
    else if (percentage >= 50) performanceMessage = ' Not bad! Keep practicing!';
    else performanceMessage = '📚 Keep learning and try again!';
    
    document.getElementById('finalText').textContent = 
        `You scored ${score} out of ${questions.length} - ${performanceMessage}`;
    
    // Update result progress bar
    document.getElementById('resultProgress').style.width = `${percentage}%`;

    // Display answer review
    displayAnswerReview();

    // Show results screen
    showScreen(resultsScreen);
}

/**
 * Display detailed answer review
 */
function displayAnswerReview() {
    const reviewContainer = document.getElementById('reviewContainer');
    reviewContainer.innerHTML = '';
    
    answers.forEach((answer, index) => {
        const div = document.createElement('div');
        div.className = `review-item ${answer.isCorrect ? 'correct' : 'incorrect'}`;
        
        let html = `
            <div class="review-question">Q${index + 1}: ${decodeHTML(answer.question)}</div>
            <div class="review-answer">Your answer: ${decodeHTML(answer.selected)}</div>
        `;
        
        if (!answer.isCorrect) {
            html += `<div class="review-answer">Correct answer: ${decodeHTML(answer.correct)}</div>`;
        }
        
        div.innerHTML = html;
        reviewContainer.appendChild(div);
    });
}

// ========================================
// HISTORY FUNCTIONS
// ========================================

/**
 * Display quiz history
 */
function displayHistory() {
    if (quizHistory.length === 0) {
        historyCard.classList.add('hidden');
        return;
    }

    historyCard.classList.remove('hidden');
    const container = document.getElementById('historyContainer');
    container.innerHTML = '';

    // Show last 5 quizzes
    quizHistory.slice(-5).reverse().forEach(quiz => {
        const div = document.createElement('div');
        div.className = 'history-card';
        
        const date = new Date(quiz.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        div.innerHTML = `
            <div class="history-info">
                <h3>${quiz.category}</h3>
                <p>${quiz.difficulty.toUpperCase()} • ${quiz.total} questions</p>
                <p style="font-size: 12px; color: #999;">${formattedDate}</p>
            </div>
            <div class="history-score">
                <h4>${quiz.percentage}%</h4>
                <p>${quiz.score}/${quiz.total}</p>
            </div>
        `;
        container.appendChild(div);
    });
}

/**
 * Clear all quiz history
 */
function clearHistory() {
    if (confirm('Are you sure you want to clear all quiz history? This action cannot be undone.')) {
        quizHistory = [];
        localStorage.removeItem('quizHistory');
        historyCard.classList.add('hidden');
    }
}

/**
 * Return to home screen
 */
function goHome() {
    showScreen(homeScreen);
    displayHistory();
}

// ========================================
// EVENT LISTENERS
// ========================================
startBtn.addEventListener('click', fetchQuestions);
nextBtn.addEventListener('click', nextQuestion);
exitBtn.addEventListener('click', goHome);
retakeBtn.addEventListener('click', goHome);
homeBtn.addEventListener('click', goHome);
clearHistoryBtn.addEventListener('click', clearHistory);

// ========================================
// INITIALIZATION
// ========================================
fetchCategories();
displayHistory();