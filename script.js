// ========================================
// BLOCKVOTE - BLOCKCHAIN VOTING SYSTEM
// Enhanced JavaScript with Google Auth & AI Chatbot
// ========================================

// ========================================
// CONFIGURATION
// ========================================
const API_BASE_URL = 'http://localhost:5000/api';
const GOOGLE_CLIENT_ID = '38115269432-3k5r2736755aoqtqq96d33r060r6af9g.apps.googleusercontent.com';

// State Management
let currentUser = null;
let authToken = null;
let polls = [];
let currentVoter = null;
let currentPollIdHome = null;
let selectedPollType = 'default';

// ========================================
// GOOGLE AUTHENTICATION
// ========================================

function initializeGoogleSignIn() {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback
        });

        google.accounts.id.renderButton(
            document.getElementById('google-signin-button'),
            { 
                theme: 'filled_blue',
                size: 'large',
                width: 300,
                text: 'signin_with'
            }
        );
    }
}

async function handleGoogleCallback(response) {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });

        const data = await res.json();

        if (data.success) {
            authToken = data.data.token;
            currentUser = data.data.user;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            updateUIForLoggedInUser();
            document.getElementById('auth-modal').classList.remove('active');
            
            alert(`Welcome ${currentUser.name}!`);
        } else {
            alert('Login failed: ' + data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

function updateUIForLoggedInUser() {
    document.getElementById('login-btn').style.display = 'none';
    const profile = document.getElementById('user-profile');
    profile.classList.add('active');
    document.getElementById('user-avatar').src = currentUser.picture;
    document.getElementById('user-name').textContent = currentUser.name;
    
    document.getElementById('poll-type-selector').classList.add('active');
    loadUserPolls();
}

function checkExistingLogin() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        updateUIForLoggedInUser();
    }
}

document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    document.getElementById('login-btn').style.display = 'block';
    document.getElementById('user-profile').classList.remove('active');
    document.getElementById('poll-type-selector').classList.remove('active');
    document.getElementById('my-polls-section').style.display = 'none';
    
    alert('Logged out successfully');
});

document.getElementById('login-btn').addEventListener('click', () => {
    document.getElementById('auth-modal').classList.add('active');
});

document.getElementById('close-auth-modal').addEventListener('click', () => {
    document.getElementById('auth-modal').classList.remove('active');
});

// ========================================
// CHATBOT FUNCTIONALITY
// ========================================

const chatbotKnowledge = {
    greetings: ['hello', 'hi', 'hey', 'greetings'],
    pollCreation: ['create poll', 'make poll', 'new poll', 'start poll', 'how to create'],
    voting: ['vote', 'cast vote', 'how to vote', 'voting process'],
    blockchain: ['blockchain', 'security', 'transparent', 'decentralized', 'crypto'],
    results: ['results', 'see results', 'view results', 'check results'],
    closing: ['close poll', 'end poll', 'stop poll', 'disable poll'],
    moderated: ['moderated poll', 'scheduled poll', 'auto close', 'set time']
};

const chatbotResponses = {
    greeting: "Hello! I'm here to help you with BlockVote. Ask me about creating polls, voting, blockchain security, or managing your polls!",
    
    pollCreation: "To create a poll:\n\n1. Click 'Create Poll' in the navigation\n2. If logged in, choose between Default or Moderated poll\n3. Enter your poll title and candidates\n4. For moderated polls, you can set an auto-close date\n5. Click 'Create Poll' and share the link!\n\nDefault polls are open-ended, while moderated polls let you control when voting ends.",
    
    voting: "To vote on a poll:\n\n1. Get the poll link from the poll creator\n2. Click 'Home' and select 'Vote on Poll'\n3. Paste the poll link\n4. Register with your name, voter ID, email, and blockchain wallet address\n5. Select your preferred candidate\n6. Submit your vote!\n\nYour vote is recorded on the blockchain for maximum security and transparency.",
    
    blockchain: "BlockVote uses blockchain technology to ensure:\n\n🔒 Security: Each vote is cryptographically secured\n✅ Transparency: All votes are verifiable\n🚫 Immutability: Votes cannot be altered once cast\n🔐 Privacy: Voter identity is protected while maintaining verification\n\nYour wallet address acts as your unique identifier, preventing duplicate votes while maintaining anonymity.",
    
    results: "To view poll results:\n\n1. Go to the 'Results' page\n2. Enter your blockchain wallet address\n3. You'll see all polls you've voted in\n4. Select a poll to view detailed results\n\n⚠️ You must have voted in a poll to see its results. This ensures only participants can access outcomes.",
    
    closing: "To close a poll (requires login):\n\nAutomatic Closing:\n- When creating a moderated poll, set the 'Close Date & Time'\n- The poll will automatically close at that time\n\nManual Closing:\n- Go to 'Create Poll' page\n- Scroll to 'My Polls' section\n- Click 'Close Poll' on any of your active polls\n- You can also reopen closed polls anytime",
    
    moderated: "Moderated Polls are enhanced polls available when you login with Google:\n\nFeatures:\n✅ Set automatic closing date and time\n✅ Manually close/reopen polls anytime\n✅ View all your polls in one dashboard\n✅ See vote counts for each poll\n✅ Control when voting ends\n\nDefault Polls (no login needed):\n✅ Open-ended voting\n✅ Never expire\n✅ Anyone can create\n\nLogin to access moderated poll features!",
    
    offTopic: "I'm specifically designed to help with BlockVote and blockchain voting. I can answer questions about:\n\n• Creating and managing polls\n• Voting process\n• Blockchain technology in voting\n• Viewing results\n• Poll security features\n\nPlease ask me something related to these topics!",
    
    default: "I can help you with:\n\n📋 Creating Polls - How to set up default or moderated polls\n🗳️ Voting - The voting process and requirements\n🔒 Blockchain Security - How blockchain ensures vote integrity\n📊 Results - Accessing and viewing poll results\n⚙️ Poll Management - Closing and reopening polls\n\nWhat would you like to know?"
};

function getChatbotResponse(userMessage) {
    const message = userMessage.toLowerCase().trim();
    
    if (chatbotKnowledge.greetings.some(word => message.includes(word))) {
        return chatbotResponses.greeting;
    }
    
    if (chatbotKnowledge.pollCreation.some(phrase => message.includes(phrase))) {
        return chatbotResponses.pollCreation;
    }
    
    if (chatbotKnowledge.voting.some(phrase => message.includes(phrase))) {
        return chatbotResponses.voting;
    }
    
    if (chatbotKnowledge.blockchain.some(phrase => message.includes(phrase))) {
        return chatbotResponses.blockchain;
    }
    
    if (chatbotKnowledge.results.some(phrase => message.includes(phrase))) {
        return chatbotResponses.results;
    }
    
    if (chatbotKnowledge.closing.some(phrase => message.includes(phrase))) {
        return chatbotResponses.closing;
    }
    
    if (chatbotKnowledge.moderated.some(phrase => message.includes(phrase))) {
        return chatbotResponses.moderated;
    }
    
    const votingRelated = Object.values(chatbotKnowledge).flat().some(phrase => message.includes(phrase));
    if (!votingRelated) {
        return chatbotResponses.offTopic;
    }
    
    return chatbotResponses.default;
}

document.getElementById('chatbot-toggle').addEventListener('click', () => {
    document.getElementById('chatbot-container').classList.add('open');
    document.getElementById('chatbot-toggle').style.display = 'none';
});

document.getElementById('chatbot-close').addEventListener('click', () => {
    document.getElementById('chatbot-container').classList.remove('open');
    document.getElementById('chatbot-toggle').style.display = 'flex';
});

document.getElementById('chatbot-send').addEventListener('click', sendChatMessage);
document.getElementById('chatbot-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

function sendChatMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    addChatMessage(message, 'user');
    
    setTimeout(() => {
        const response = getChatbotResponse(message);
        addChatMessage(response, 'bot');
    }, 500);
    
    input.value = '';
}

function addChatMessage(text, sender) {
    const messagesDiv = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ========================================
// POLL TYPE SELECTION
// ========================================

document.querySelectorAll('.poll-type-option').forEach(option => {
    option.addEventListener('click', function() {
        document.querySelectorAll('.poll-type-option').forEach(opt => 
            opt.classList.remove('selected')
        );
        this.classList.add('selected');
        selectedPollType = this.dataset.type;
        
        const closeOptions = document.getElementById('close-poll-options');
        if (selectedPollType === 'moderated') {
            closeOptions.classList.add('active');
        } else {
            closeOptions.classList.remove('active');
        }
    });
});

// ========================================
// NAVIGATION LOGIC
// ========================================

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = btn.getAttribute('data-page');
        
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        let page = document.getElementById(targetPage);
        if (page) {
            page.classList.add('active');
        }
        
        if (targetPage === "home") hideAllHomeSections();
        
        if (targetPage === "results") {
            if (document.getElementById("resultsAccessForm")) document.getElementById("resultsAccessForm").reset();
            if (document.getElementById("resultsAccessMsg")) document.getElementById("resultsAccessMsg").style.display = "none";
            if (document.getElementById("allResultsSection")) document.getElementById("allResultsSection").style.display = "none";
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

document.getElementById("chooseCreatePoll").onclick = function () {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    const createPollNav = document.querySelector('.nav-btn[data-page="create-poll"]');
    if (createPollNav) createPollNav.classList.add('active');
    
    const createPollPage = document.getElementById('create-poll');
    if (createPollPage) createPollPage.classList.add('active');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.getElementById("chooseVotePoll").onclick = function () {
    hideAllHomeSections();
    document.getElementById("homeVotePollSection").style.display = "block";
    
    setTimeout(() => {
        const voteSection = document.getElementById("homeVotePollSection");
        if (voteSection) {
            voteSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
};

function hideAllHomeSections() {
    document.getElementById("homeVotePollSection").style.display = "none";
    document.getElementById("homeRegisterSection").style.display = "none";
    document.getElementById("homeVoteSection").style.display = "none";
}

// ========================================
// CREATE POLL LOGIC
// ========================================

function removeCandidateHome(btn) {
    let container = document.getElementById("candidateFieldsHome");
    if (container.children.length > 2) {
        btn.parentElement.remove();
    }
    
    Array.from(container.querySelectorAll(".remove-candidate-btn")).forEach(b => {
        b.style.display = container.children.length > 2 ? "inline-block" : "none";
    });
}
window.removeCandidateHome = removeCandidateHome;

const addCandidateBtnHome = document.getElementById("addCandidateBtnHome");
if (addCandidateBtnHome) {
    addCandidateBtnHome.onclick = function () {
        let fieldsContainer = document.getElementById("candidateFieldsHome");
        let count = fieldsContainer.querySelectorAll(".candidate-input").length;
        
        if (count < 7) {
            const idx = count + 1;
            const div = document.createElement("div");
            div.className = "form-group candidate-input";
            div.innerHTML = `
                <label for="candidate${idx}">Candidate ${idx}</label>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="candidate${idx}" name="candidate${idx}" 
                           placeholder="Enter candidate name" required />
                    <button type="button" class="btn-secondary remove-candidate-btn" 
                            onclick="removeCandidateHome(this)">✕</button>
                </div>
            `;
            fieldsContainer.appendChild(div);
            
            Array.from(fieldsContainer.querySelectorAll(".remove-candidate-btn")).forEach(b => {
                b.style.display = fieldsContainer.children.length > 2 ? "inline-block" : "none";
            });
        }
    };
}

document.getElementById('createPollForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const pollTitle = document.getElementById('pollTitle').value.trim();
    const candidateInputs = document.querySelectorAll('.candidate-input input');
    const candidateNames = [];
    
    candidateInputs.forEach(inp => {
        if (inp.value.trim() !== "") candidateNames.push(inp.value.trim());
    });
    
    if (!pollTitle || candidateNames.length < 2) {
        showPollCreationStatus("Title and at least two candidates required.", "error");
        return;
    }
    
    try {
        let endpoint, requestBody;
        
        if (selectedPollType === 'moderated' && authToken) {
            const endDate = document.getElementById('poll-end-date').value;
            endpoint = `${API_BASE_URL}/polls/moderated`;
            requestBody = {
                title: pollTitle,
                candidates: candidateNames,
                endDate: endDate || null
            };
        } else {
            endpoint = `${API_BASE_URL}/polls`;
            requestBody = {
                title: pollTitle,
                candidates: candidateNames
            };
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.success) {
            const pollId = data.data.pollId;
            polls.push({ id: pollId, title: pollTitle, candidates: candidateNames });
            
            showPollCreationStatus("Poll created successfully!", "success");
            
            const url = `${window.location.origin}${window.location.pathname}?poll=${pollId}`;
            document.getElementById("pollLinkHome").value = url;
            document.getElementById('pollLinkSectionHome').style.display = 'block';
            
            this.reset();
            document.getElementById('poll-end-date').value = '';
            
            let fieldsContainer = document.getElementById("candidateFieldsHome");
            while (fieldsContainer.children.length > 2) {
                fieldsContainer.lastChild.remove();
            }
            
            if (authToken) {
                loadUserPolls();
            }
        } else {
            showPollCreationStatus(data.message || "Failed to create poll", "error");
        }
    } catch (error) {
        console.error('Error creating poll:', error);
        showPollCreationStatus("Error creating poll. Check backend connection.", "error");
    }
});

function showPollCreationStatus(msg, type) {
    const stat = document.getElementById("pollCreationStatus");
    stat.textContent = msg;
    stat.className = "status-message " + type;
    stat.style.display = 'block';
    setTimeout(() => stat.style.display = 'none', 2000);
}

function copyPollLinkHome() {
    const inp = document.getElementById("pollLinkHome");
    inp.select();
    document.execCommand("copy");
    alert("Link copied!");
}
window.copyPollLinkHome = copyPollLinkHome;

// ========================================
// LOAD USER POLLS
// ========================================

async function loadUserPolls() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/polls/user/my-polls`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayUserPolls(data.data);
        }
    } catch (error) {
        console.error('Error loading user polls:', error);
    }
}

function displayUserPolls(polls) {
    const section = document.getElementById('my-polls-section');
    const list = document.getElementById('my-polls-list');
    
    if (polls.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    list.innerHTML = '';
    
    polls.forEach(poll => {
        const pollCard = document.createElement('div');
        pollCard.className = 'poll-card';
        
        const status = poll.isActive ? 
            '<span style="color: var(--success-pastel)">● Active</span>' : 
            '<span style="color: var(--accent-pastel)">● Closed</span>';
        
        const endDate = poll.endDate ? 
            `<p><small>Closes: ${new Date(poll.endDate).toLocaleString()}</small></p>` : 
            '<p><small>No end date</small></p>';
        
        pollCard.innerHTML = `
            <h4>${poll.title} ${status}</h4>
            <p><small>Created: ${new Date(poll.createdAt).toLocaleDateString()}</small></p>
            ${endDate}
            <p><small>Poll ID: ${poll.pollId}</small></p>
            <div style="display: flex; gap: 10px; margin-top: 12px;">
                ${poll.isActive ? 
                    `<button class="btn-secondary" onclick="closePoll('${poll.pollId}')">Close Poll</button>` :
                    `<button class="btn-secondary" onclick="reopenPoll('${poll.pollId}')">Reopen Poll</button>`
                }
                <button class="btn-primary" onclick="viewPollResults('${poll.pollId}', true)">View Results</button>
            </div>
        `;
        
        list.appendChild(pollCard);
    });
}

async function closePoll(pollId) {
    if (!authToken) return;
    
    if (!confirm('Are you sure you want to close this poll? No more votes will be accepted.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/polls/${pollId}/close`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Poll closed successfully');
            loadUserPolls();
        } else {
            alert('Failed to close poll: ' + data.message);
        }
    } catch (error) {
        console.error('Error closing poll:', error);
        alert('Error closing poll');
    }
}

async function reopenPoll(pollId) {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/polls/${pollId}/reopen`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Poll reopened successfully');
            loadUserPolls();
        } else {
            alert('Failed to reopen poll: ' + data.message);
        }
    } catch (error) {
        console.error('Error reopening poll:', error);
        alert('Error reopening poll');
    }
}

window.closePoll = closePoll;
window.reopenPoll = reopenPoll;

// ========================================
// VOTE BY LINK LOGIC
// ========================================

async function loadAllPolls() {
    try {
        const response = await fetch(`${API_BASE_URL}/polls`);
        const data = await response.json();
        
        if (data.success) {
            polls = data.data.map(poll => ({
                id: poll.pollId,
                title: poll.title,
                candidates: poll.candidates
            }));
        }
    } catch (error) {
        console.error('Error loading polls:', error);
    }
}

document.getElementById("goToRegisterHome").onclick = async function () {
    const link = document.getElementById("pollLinkInputHome").value.trim();
    
    if (!link) {
        alert("Please paste a poll link.");
        return;
    }
    
    try {
        const url = new URL(link, window.location.href);
        const pollId = new URLSearchParams(url.search).get("poll");
        
        const response = await fetch(`${API_BASE_URL}/polls/${pollId}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            currentPollIdHome = pollId;
            
            const existingPoll = polls.find(p => p.id === pollId);
            if (!existingPoll) {
                polls.push({
                    id: data.data.pollId,
                    title: data.data.title,
                    candidates: data.data.candidates
                });
            }
            
            hideAllHomeSections();
            document.getElementById("homeRegisterSection").style.display = "block";
        } else {
            alert("Invalid link or poll not found!");
        }
    } catch (error) {
        console.error('Error fetching poll:', error);
        alert("Please paste a valid poll link or check backend connection.");
    }
};

// ========================================
// REGISTRATION + VOTE LOGIC
// ========================================

const registerFormHome = document.getElementById('registerFormHome');

if (registerFormHome) {
    registerFormHome.addEventListener('submit', async function (e) {
        e.preventDefault();
        
        const voterName = document.getElementById('voterNameHome').value.trim();
        const voterId = document.getElementById('voterIdHome').value.trim().toUpperCase();
        const email = document.getElementById('emailHome').value.trim();
        const walletAddress = document.getElementById('walletAddressHome').value.trim();
        
        if (!voterName || !voterId || !email || !walletAddress) {
            showRegistrationStatusHome('All fields are required.', 'error');
            return;
        }
        
        if (email.indexOf('@') === -1) {
            showRegistrationStatusHome('Enter a valid email.', 'error');
            return;
        }
        
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            showRegistrationStatusHome('Please enter a valid blockchain wallet address (0x...)', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/voters/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: voterName,
                    voterId: voterId,
                    email: email,
                    walletAddress: walletAddress
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentVoter = {
                    name: voterName,
                    voterId: voterId,
                    email: email,
                    walletAddress: walletAddress
                };
                
                showRegistrationStatusHome('Registration successful! Proceed to vote.', 'success');
                
                setTimeout(() => {
                    hideAllHomeSections();
                    showVoteCandidatesHome();
                }, 1000);
                
                registerFormHome.reset();
            } else {
                showRegistrationStatusHome(data.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Error registering voter:', error);
            showRegistrationStatusHome('Error registering. Check backend connection.', 'error');
        }
    });
}

function showRegistrationStatusHome(message, type) {
    const statusElement = document.getElementById('registrationStatusHome');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    setTimeout(() => statusElement.style.display = 'none', 1800);
}

async function showVoteCandidatesHome() {
    try {
        const response = await fetch(`${API_BASE_URL}/polls/${currentPollIdHome}`);
        const data = await response.json();
        
        if (!data.success || !data.data) {
            alert("Invalid poll!");
            return;
        }
        
        const poll = data.data;
        
        if (!poll.isActive) {
            alert("This poll has been closed and is no longer accepting votes.");
            return;
        }
        
        document.getElementById("homeVoteSection").style.display = "block";
        document.getElementById("activePollTitleHome").textContent = poll.title;
        
        let grid = document.createElement("div");
        grid.className = "candidates-grid";
        grid.innerHTML = poll.candidates.map((name, i) => `
            <label class="candidate-card">
                <input type="radio" name="candidate" value="${name}" required />
                <span>${name}</span>
            </label>
        `).join('');
        
        const form = document.getElementById("voteFormHome");
        form.querySelector(".candidates-grid")?.remove();
        form.insertBefore(grid, form.querySelector("button[type=submit]"));
    } catch (error) {
        console.error('Error loading candidates:', error);
        alert('Error loading candidates. Check backend connection.');
    }
}

const voteFormHome = document.getElementById('voteFormHome');

if (voteFormHome) {
    voteFormHome.addEventListener('submit', async function (e) {
        e.preventDefault();
        
        if (!currentVoter || !currentPollIdHome) {
            alert("Select a poll and register first.");
            return;
        }
        
        const selectedCandidate = voteFormHome.querySelector("input[name='candidate']:checked");
        if (!selectedCandidate) {
            alert('Please select a candidate.');
            return;
        }
        
        const candidateName = selectedCandidate.value;
        
        try {
            const response = await fetch(`${API_BASE_URL}/votes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pollId: currentPollIdHome,
                    voterId: currentVoter.voterId,
                    candidate: candidateName,
                    walletAddress: currentVoter.walletAddress
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(`Your vote for ${candidateName} has been recorded securely on the blockchain.`);
                voteFormHome.reset();
                document.getElementById("homeVoteSection").style.display = "none";
            } else {
                alert(data.message || 'Failed to cast vote');
            }
        } catch (error) {
            console.error('Error casting vote:', error);
            alert('Error submitting vote. Check backend connection.');
        }
    });
}

// ========================================
// RESULTS PAGE LOGIC
// ========================================

const resultsAccessForm = document.getElementById("resultsAccessForm");
let eligiblePolls = [];

if (resultsAccessForm) {
    resultsAccessForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        document.getElementById("resultsAccessMsg").style.display = "none";
        
        const address = document.getElementById("walletAddressResults").value.trim();
        
        if (!address) {
            showResultsAccessMsg("Please enter your blockchain wallet address.", "error");
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/votes/wallet/${address}`);
            const data = await response.json();
            
            if (!data.success || data.count === 0) {
                showResultsAccessMsg("You must vote at least once (with this address) to access results.", "error");
                document.getElementById("allResultsSection").style.display = "none";
                return;
            }
            
            const votedPollIds = [...new Set(data.data.map(v => v.pollId))];
            eligiblePolls = polls.filter(poll => votedPollIds.includes(poll.id));
            
            if (eligiblePolls.length === 0) {
                showResultsAccessMsg("No eligible polls found for this address.", "error");
                document.getElementById("allResultsSection").style.display = "none";
                return;
            }
            
            showResultsAccessMsg("Access granted. Select a poll to view results.", "success");
            renderResultsPollList(address);
            document.getElementById("allResultsSection").style.display = "block";
        } catch (error) {
            console.error('Error fetching votes:', error);
            showResultsAccessMsg("Error verifying wallet. Check backend connection.", "error");
        }
    });
}

function showResultsAccessMsg(msg, type) {
    const resultsAccessMsg = document.getElementById("resultsAccessMsg");
    resultsAccessMsg.textContent = msg;
    resultsAccessMsg.className = "status-message " + type;
    resultsAccessMsg.style.display = "block";
    setTimeout(() => resultsAccessMsg.style.display = 'none', 2000);
}

function renderResultsPollList(address) {
    const resultsPollList = document.getElementById("resultsPollList");
    resultsPollList.innerHTML = "";
    
    eligiblePolls.forEach(poll => {
        const li = document.createElement("li");
        li.innerHTML = `
            ${poll.title}
            <button class="btn-primary" onclick="viewPollResults('${poll.id}')">
                View Results
            </button>
        `;
        resultsPollList.appendChild(li);
    });
}

window.viewPollResults = async function(pollId, fromMyPolls = false) {
    try {
        const response = await fetch(`${API_BASE_URL}/polls/${pollId}/results`);
        const data = await response.json();
        
        if (!data.success) {
            document.getElementById("resultsGridSection").innerHTML = `<p class="error-message">Error loading results</p>`;
            return;
        }
        
        const { results, totalVotes, poll } = data.data;
        
        let html = "";
        poll.candidates.forEach(candidate => {
            let count = results[candidate] || 0;
            let percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            
            html += `
                <div class="result-card">
                    <div class="result-candidate">${candidate}</div>
                    <div class="result-bar">
                        <div class="result-fill" style="width: ${percentage}%;"></div>
                    </div>
                    <div class="result-stats">
                        <span class="result-percentage">${percentage}%</span>
                        <span class="result-votes">${count} votes</span>
                    </div>
                </div>
            `;
        });
        
        document.getElementById("resultsGridSection").innerHTML = html;
        document.getElementById("totalVotesCount").textContent = totalVotes;
        
        if (!fromMyPolls) {
            document.getElementById("allResultsSection").style.display = "block";
        }
    } catch (error) {
        console.error('Error viewing results:', error);
        document.getElementById("resultsGridSection").innerHTML = `<p class="error-message">Error loading results. Check backend connection.</p>`;
    }
};

// ========================================
// INITIALIZE APP
// ========================================

window.addEventListener('DOMContentLoaded', async () => {
    initializeGoogleSignIn();
    checkExistingLogin();
    await loadAllPolls();
    
    const urlParams = new URLSearchParams(window.location.search);
    const pollIdFromUrl = urlParams.get('poll');
    if (pollIdFromUrl) {
        currentPollIdHome = pollIdFromUrl;
    }
});
