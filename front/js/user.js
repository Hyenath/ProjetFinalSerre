const user = {
    firstName: "Florent",
    lastName: "Germain"
};

// Sélectionner l'élément avec l'ID "username"
const usernameElement = document.getElementById('username');

// Insérer le nom et le prénom dans l'élément
usernameElement.textContent = `${user.firstName} ${user.lastName}`;