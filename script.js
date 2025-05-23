let currentPage = 'dashboard';
let volunteers = JSON.parse(localStorage.getItem('volunteers') || '[]');

const validCredentials = {
    username: 'admin',
    password: 'admin123'
};

function login(username, password) {
    if (username === validCredentials.username && password === validCredentials.password) {
        localStorage.setItem('isLoggedIn', 'true');
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('appPage').classList.remove('hidden');
        updateVolunteerCount();
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    document.getElementById('appPage').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
}

function showPage(pageName) {
    document.querySelectorAll('.content').forEach(page => page.classList.add('hidden'));
    document.getElementById(pageName).classList.remove('hidden');
    
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page === pageName) btn.classList.add('active');
    });
    
    currentPage = pageName;
}

async function fetchAddress(cep) {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        return data.erro ? null : data;
    } catch (error) {
        console.error('Error fetching address:', error);
        return null;
    }
}

function addVolunteer(volunteer) {
    const searchTerms = [
        encodeURIComponent(volunteer.name.split(' ')[0]),
        'volunteer',
        'person'
    ].join(',');

    const timestamp = Date.now();
    const imageUrl = `https://source.unsplash.com/160x160/?${searchTerms}&t=${timestamp}`;

    const newVolunteer = {
        ...volunteer,
        id: Date.now().toString(),
        imageUrl
    };
    volunteers.push(newVolunteer);
    saveVolunteers();
    updateVolunteerCount();
    return newVolunteer;
}

function removeVolunteer(id) {
    volunteers = volunteers.filter(v => v.id !== id);
    saveVolunteers();
    updateVolunteerCount();
    renderVolunteerList();
}

function clearAllVolunteers() {
    if (confirm('Tem certeza que deseja remover todos os voluntários?')) {
        volunteers = [];
        saveVolunteers();
        updateVolunteerCount();
        renderVolunteerList();
    }
}

function saveVolunteers() {
    localStorage.setItem('volunteers', JSON.stringify(volunteers));
}

function updateVolunteerCount() {
    document.getElementById('volunteerCount').textContent = volunteers.length;
}

function renderVolunteerList(filter = '') {
    const listElement = document.getElementById('volunteerList');
    const filteredVolunteers = volunteers.filter(v => 
        v.name.toLowerCase().includes(filter.toLowerCase())
    );

    listElement.innerHTML = filteredVolunteers.map(volunteer => {
        const fallbackUrl = `https://source.unsplash.com/160x160/?volunteer,portrait&t=${volunteer.id}`;
        
        return `
            <div class="volunteer-card">
                <div class="volunteer-card-header">
                    <img 
                        src="${volunteer.imageUrl}" 
                        alt="${volunteer.name}"
                        onerror="if (!this.retryCount) {
                            this.retryCount = 1;
                            this.src = '${fallbackUrl}';
                        } else if (this.retryCount === 1) {
                            this.retryCount = 2;
                            this.src = 'https://source.unsplash.com/160x160/?person';
                        }"
                    >
                    <div class="volunteer-info">
                        <h3>${volunteer.name}</h3>
                        <p>${volunteer.email}</p>
                    </div>
                    <button class="delete-button" onclick="removeVolunteer('${volunteer.id}')">×</button>
                </div>
                <div class="volunteer-card-footer">
                    <p>${volunteer.address.logradouro}, ${volunteer.address.bairro}</p>
                    <p>${volunteer.address.localidade} - ${volunteer.address.uf}</p>
                    <p>CEP: ${volunteer.address.cep}</p>
                </div>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('appPage').classList.remove('hidden');
        updateVolunteerCount();
    }

    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        if (!login(username, password)) {
            alert('Credenciais inválidas!');
        }
    });

    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => showPage(button.dataset.page));
    });

    document.getElementById('logoutButton').addEventListener('click', logout);

    const volunteerForm = document.getElementById('volunteerForm');
    const cepInput = document.getElementById('cep');
    const addressInfo = document.getElementById('addressInfo');
    const addressDetails = document.getElementById('addressDetails');

    cepInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.slice(0, 8);
        if (value.length > 5) {
            value = value.slice(0, 5) + '-' + value.slice(5);
        }
        e.target.value = value;

        if (value.replace(/\D/g, '').length === 8) {
            fetchAddress(value).then(address => {
                if (address) {
                    addressInfo.classList.remove('hidden');
                    addressDetails.textContent = `${address.logradouro}, ${address.bairro}, ${address.localidade} - ${address.uf}`;
                    addressInfo.dataset.address = JSON.stringify(address);
                } else {
                    addressInfo.classList.add('hidden');
                    delete addressInfo.dataset.address;
                }
            });
        } else {
            addressInfo.classList.add('hidden');
            delete addressInfo.dataset.address;
        }
    });

    volunteerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const emailInput = document.getElementById('email').value.trim();

        // Verifica se o e-mail já existe
        const emailExistente = volunteers.some(v => v.email === emailInput);
        if (emailExistente) {
            alert('Erro: Este e-mail já está cadastrado!');
            return;
        }
        
        const address = addressInfo.dataset.address;
        if (!address) {
            alert('Por favor, insira um CEP válido.');
            return;
        }

        const newVolunteer = addVolunteer({
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            cep: document.getElementById('cep').value,
            address: JSON.parse(address)
        });

        volunteerForm.reset();
        addressInfo.classList.add('hidden');
        delete addressInfo.dataset.address;
        
        alert('Voluntário cadastrado com sucesso!');
        showPage('list');
        renderVolunteerList();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderVolunteerList(e.target.value);
    });

    document.getElementById('clearAll').addEventListener('click', clearAllVolunteers);

    renderVolunteerList();
});

let inatividadeTimeout;

function resetarInatividade() {
    clearTimeout(inatividadeTimeout);
    inatividadeTimeout = setTimeout(() => {
        alert('Sessão expirada por inatividade.');
        logout();
    }, 5 * 60 * 1000);
}

['click', 'keydown', 'mousemove', 'scroll'].forEach(event => {
    document.addEventListener(event, resetarInatividade);
});