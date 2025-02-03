document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Empêche la soumission par défaut
    console.log("lancement")
    
    // Récupérer les valeurs des champs
    const email = document.getElementById('Email').value;
    const password = document.getElementById('Password').value;
    const rememberMe = document.getElementById('Check').checked;

    // Préparer les données à envoyer
    const loginData = {
        email: email,
        password: password,
        rememberMe: rememberMe,
    };

    // Envoi des données au serveur avec fetch
    fetch('http://192.168.65.74:3001/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Connexion réussie') {
            alert('Connexion réussie !');
            localStorage.setItem('authToken', data.token);
            // Redirection vers la page d'accueil
            window.location.href = 'index.html';
        } else {
            alert('Erreur de connexion : ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('Erreur serveur. Veuillez réessayer plus tard.');
    });
});