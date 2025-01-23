document.getElementById('enregistrer').addEventListener('submit', function(event) {
    // Récupérer les deux mots de passe
    const password = document.getElementById('MDP1').value;
    const confirmPassword = document.getElementById('MDP2').value;

    // Vérifier si les mots de passe correspondent
    if (password !== confirmPassword) {
        event.preventDefault(); // Empêcher l'envoi du formulaire
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.style.display = 'block'; // Afficher le message d'erreur
    }
});