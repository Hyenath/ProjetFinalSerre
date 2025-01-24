document.getElementById('enregistrer').addEventListener('submit', function(e) {
    e.preventDefault(); // Empêche la soumission du formulaire

    // Récupération des valeurs des champs
    const firstname = document.getElementById('exampleFirstName').value;
    const lastname = document.getElementById('exampleLastName').value;
    const email = document.getElementById('exampleInputEmail').value;
    const password1 = document.getElementById('MDP1').value;
    const password2 = document.getElementById('MDP2').value;

    // Vérifier si les mots de passe correspondent
    if (password1 !== password2) {
        document.getElementById('errorMessage').style.display = 'block';
        return; // Empêche l'envoi des données si les mots de passe ne correspondent pas
    } else {
        document.getElementById('errorMessage').style.display = 'none';
    }

    // Préparation des données à envoyer
    const userData = {
        firstname: firstname,
        name: lastname,
        email: email,
        password: password1
    };

    // Envoi de la requête POST avec fetch
    fetch('http://192.168.65.74:3001/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Inscription réussie') {
            alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
            window.location.href = 'login.html'; // Rediriger vers la page de connexion
        } else {
            alert('Erreur lors de l\'inscription : ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('Erreur serveur. Veuillez réessayer plus tard.');
    });
});