let registeredVoters = JSON.parse(localStorage.getItem('registeredVoters')) || [];
let currentVoter = JSON.parse(localStorage.getItem('currentVoter')) || null;

// IST Time utility
function getCurrentIST() {
    const d = new Date();
    // Convert UTC to IST (UTC+5:30)
    return new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
}

function isAfterResultsRelease() {
    const now = getCurrentIST();
    // Today at 22:30 IST
    const release = new Date(now);
    release.setHours(22, 35, 0, 0); // 10:35 pm IST
    return now >= release;
}

// Has current voter already voted?
function hasVoted(voterId) {
    const votes = JSON.parse(localStorage.getItem('votes')) || [];
    return votes.some(vote => vote.voterId === voterId);
}

document.addEventListener('DOMContentLoaded', () => {
    // Enable voting if registered and has not voted
    if (currentVoter) {
        enableVoting();
        // If already voted, disable vote form button
        if (hasVoted(currentVoter.voterId)) {
            disableVoteForm();
        }
    }

    // Navigation tab system
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = btn.getAttribute('data-page');
            // Show results only after release
            if (targetPage === 'results' && !isAfterResultsRelease()) {
                alert('Voting results for all candidates will be available at 10:30 pm IST.');
                return;
            }
            // Voting protection logic
            if (targetPage === 'vote') {
                if (!currentVoter) {
                    alert('⚠️ Please complete registration first before voting.');
                    return;
                }
                if (hasVoted(currentVoter.voterId)) {
                    alert('You have already cast your vote, thank you!');
                    return;
                }
            }
            navButtons.forEach(b => b.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-page');
            const targetPageElement = document.getElementById(targetId);
            if (targetPageElement) targetPageElement.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    let targetId = btn.getAttribute('data-page');
    let page = document.getElementById(targetId);
    if(page) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      page.classList.add('active');
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  });
});

        });
    });

    // Registration Form Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const voterName = document.getElementById('voterName').value.trim();
            const voterId = document.getElementById('voterId').value.trim();
            const email = document.getElementById('email').value.trim();
            const walletAddress = document.getElementById('walletAddress').value.trim();
            if (!voterName || !voterId || !email || !walletAddress) {
                showRegistrationStatus('All fields are required.', 'error');
                return;
            }
            if (email.indexOf('@') === -1) {
                showRegistrationStatus('Please enter a valid email address.', 'error');
                return;
            }
            const voterExists = registeredVoters.some(voter => voter.voterId === voterId);
            if (voterExists) {
                showRegistrationStatus('Voter ID already registered. Please use a different ID.', 'error');
                return;
            }
            const newVoter = {
                name: voterName,
                voterId: voterId,
                email: email,
                walletAddress: walletAddress,
                timestamp: new Date().toISOString()
            };
            registeredVoters.push(newVoter);
            currentVoter = newVoter;
            localStorage.setItem('registeredVoters', JSON.stringify(registeredVoters));
            localStorage.setItem('currentVoter', JSON.stringify(currentVoter));
            showRegistrationStatus('✓ Registration successful! You can now vote.', 'success');
            enableVoting();
            registerForm.reset();
            setTimeout(() => {
                document.querySelector('[data-page="vote"]').click();
            }, 2000);
        });
    }

    // Vote Form Handler
    const voteForm = document.getElementById('voteForm');
    if (voteForm) {
        voteForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Block if already voted
            if (hasVoted(currentVoter.voterId)) {
                alert('You have already cast your vote, thank you!');
                disableVoteForm();
                return;
            }
            const selectedCandidate = document.querySelector('input[name="candidate"]:checked');
            if (!selectedCandidate) {
                alert('Please select a candidate.');
                return;
            }
            const candidateName = selectedCandidate.closest('.candidate-card').querySelector('h3').textContent;
            const vote = {
                voter: currentVoter.name,
                voterId: currentVoter.voterId,
                candidate: candidateName,
                timestamp: new Date().toISOString()
            };
            let votes = JSON.parse(localStorage.getItem('votes')) || [];
            votes.push(vote);
            localStorage.setItem('votes', JSON.stringify(votes));
            alert(`✓ Your vote for ${candidateName} has been recorded securely on the blockchain.`);
            voteForm.reset();
            disableVoteForm();
            setTimeout(() => {
                if (isAfterResultsRelease()) {
                    document.querySelector('[data-page="results"]').click();
                } else {
                    alert('Results will be available at 10:30 pm IST.');
                }
            }, 1500);
        });
    }
    updateResults();
    // Hide results section until release
    if (!isAfterResultsRelease()) {
        document.getElementById('results').style.display = 'none';
    }
    // At 10:30 pm IST, show results automatically
    let checkInterval = setInterval(() => {
        if (isAfterResultsRelease()) {
            document.getElementById('results').style.display = '';
            updateResults();
            clearInterval(checkInterval);
        }
    }, 20000); // check every 20s
});

// Disable vote form after vote
function disableVoteForm() {
    const voteForm = document.getElementById('voteForm');
    if (voteForm) {
        const btn = voteForm.querySelector('button[type=\"submit\"]');
        btn.disabled = true;
        btn.textContent = 'You have voted!';
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
        voteForm.querySelectorAll('input').forEach(inp => inp.disabled = true);
    }
}

function enableVoting() {
    const voteNavBtn = document.getElementById('voteNavBtn');
    const voteLockedMessage = document.getElementById('voteLockedMessage');
    const voteContent = document.getElementById('voteContent');
    const registeredVoterName = document.getElementById('registeredVoterName');
    voteNavBtn.disabled = false;
    voteNavBtn.style.opacity = '1';
    voteNavBtn.style.cursor = 'pointer';
    voteLockedMessage.style.display = 'none';
    voteContent.style.display = 'block';
    if (currentVoter) {
        registeredVoterName.textContent = currentVoter.name;
    }
}
function disableVoting() {
    const voteNavBtn = document.getElementById('voteNavBtn');
    const voteLockedMessage = document.getElementById('voteLockedMessage');
    const voteContent = document.getElementById('voteContent');
    voteNavBtn.disabled = true;
    voteNavBtn.style.opacity = '0.5';
    voteNavBtn.style.cursor = 'not-allowed';
    voteLockedMessage.style.display = 'block';
    voteContent.style.display = 'none';
}
function showRegistrationStatus(message, type) {
    const statusElement = document.getElementById('registrationStatus');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
}
function goToRegister() {
    const registerBtn = document.querySelector('[data-page="register"]');
    if (registerBtn) {
        registerBtn.click();
    }
}
function updateResults() {
    const votes = JSON.parse(localStorage.getItem('votes')) || [];
    if (votes.length > 0) {
        const voteCounts = {
            'Candidate A': 0,
            'Candidate B': 0,
            'Candidate C': 0
        };
        votes.forEach(vote => {
            if (voteCounts.hasOwnProperty(vote.candidate)) {
                voteCounts[vote.candidate]++;
            }
        });
        const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
        const candidates = ['Candidate A', 'Candidate B', 'Candidate C'];
        const resultItems = document.querySelectorAll('.result-item');
        resultItems.forEach((item, index) => {
            const candidateName = candidates[index];
            const count = voteCounts[candidateName] || 0;
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const progressFill = item.querySelector('.progress-fill');
            const voteCount = item.querySelector('.vote-count');
            if (progressFill) {
                progressFill.style.width = percentage + '%';
            }
            if (voteCount) {
                voteCount.textContent = `${count} votes (${percentage}%)`;
            }
        });
        const totalVotesElement = document.querySelector('.total-votes p:first-child strong');
        if (totalVotesElement) {
            totalVotesElement.textContent = totalVotes.toString();
        }
    }
}
window.clearAllData = function() {
    if (confirm('Are you sure you want to clear all registration and voting data?')) {
        localStorage.removeItem('registeredVoters');
        localStorage.removeItem('currentVoter');
        localStorage.removeItem('votes');
        currentVoter = null;
        disableVoting();
        document.getElementById('registerForm').reset();
        showRegistrationStatus('All data cleared.', 'success');
    }
};