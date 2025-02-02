const express = require('express');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

const secretKey = require('./config.json');

//Cacher les logs de git en redirigeant vers un fichier qui sera mis dans le gitignore
const config = require('./config.json');




//-------------------------------------DOSSIER POUR STOCKER IMAGE--------------------------------------------//

// Créer le dossier 'uploads' s'il n'existe pas
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration de multer pour le stockage des fichiers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware pour servir les fichiers statiques depuis le dossier 'uploads'
app.use('/uploads', express.static(uploadDir));

//------------------------------------------------MISE EN PLACE DE L'API---------------------------------------------------------//

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database
});
db.connect(err => {
    if (err) {
        console.error('Erreur de connexion à la base de données :', err);
    } else {
        console.log('Connexion réussie à la base de données MySQL');
    }
});


//----------------------------------LIMITEUR DE REQUETE ET CONNEXION-----------------------------------------//

// Configuration du rate-limiter pour toutes les routes
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limite chaque IP à 100 requêtes par windowMs
    message: 'Trop de requêtes, veuillez réessayer plus tard.',
});

// Limite spécifique pour la route de connexion
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limite à 5 tentatives de connexion par IP par 15 minutes
    message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
});

// Utiliser le rate-limiter global pour toutes les routes
app.use(globalLimiter);

//-------------------------------FONCTION POUR TOKEN----------------------------------------//

function checkToken(req, res, next) {
    const token = req.headers['authorization'];
    
    if (token) {
        jwt.verify(token.split(' ')[1], secretKey.key, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Token invalide ou expiré' });
            }
            // Si le token est valide, informer que l'utilisateur est déjà connecté
            return res.status(400).json({ message: 'Déjà connecté' });
        });
    } else {
        next();
    }
}

//-------------------------------LOGIN----------------------------------//

// Route pour la connexion avec un limiteur spécifique
app.post('/login', loginLimiter, checkToken, async (req, res) => {
    console.log("Données reçues:", req.body);  // Ajoute ceci pour voir les données
    const { email, password } = req.body;
    console.log("Email reçu:", email);  // Vérifie si l'email est bien reçu

    const sql = 'SELECT * FROM user WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        console.log(email);
        if (err) {
            return res.status(500).json({ message: 'Erreur serveur' });
        }
        if (results.length === 0) {
            return res.status(400).json({ message: 'Utilisateur non trouvé' });
        }

        const user = results[0];
        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mot de passe incorrect' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            secretKey.key,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Connexion réussie',
            token
        });
    });
});

//-----------------------------------------------REGISTER-------------------------------------------------------//

// Route POST pour l'inscription avec multer pour gérer les fichiers
app.post('/register', upload.single('capture'), async (req, res) => {
    const { firstname, name, email, password } = req.body;

    // Validation de l'email
    if (!email.includes('@')) {
        return res.status(400).json({ message: 'Email invalide' });
    }

    // Vérifier si le nom d'utilisateur existe déjà
    const sqlSelect = 'SELECT * FROM user WHERE email = ?';
    db.query(sqlSelect, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur serveur lors de la vérification de l\'utilisateur' });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'Email déjà pris' });
        }

        // Hasher le mot de passe
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insérer le nouvel utilisateur dans la base de données
        const sqlInsert = 'INSERT INTO user (nom, prenom, email, password) VALUES (?, ?, ?, ?)';
        db.query(sqlInsert, [firstname, name, email, hashedPassword], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Erreur lors de l\'inscription dans la base de données' });
            }

            res.status(201).json({ message: 'Inscription réussie', userId: result.insertId, email });
        });
    });
});

//------------------------------------Supprimer Compte---------------------------------------------//

// Route DELETE pour supprimer un compte utilisateur
app.delete('/supprimer', async (req, res) => {
    const { username } = req.body;  // Supposons que l'utilisateur envoie son nom d'utilisateur

    // Vérifier si l'utilisateur existe dans la base de données
    const sqlSelect = 'SELECT * FROM user WHERE Login = ?';
    db.query(sqlSelect, [username], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur serveur lors de la vérification de l\'utilisateur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Supprimer l'utilisateur de la base de données
        const sqlDelete = 'DELETE FROM user WHERE Login = ?';
        db.query(sqlDelete, [username], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
            }

            res.status(200).json({ message: 'Compte supprimé avec succès' });
        });
    });
});

//------------------------------------changer photo de profil------------------------------//

// Route PUT pour changer la photo de profil
app.put('/changer-photo', upload.single('profilePicture'), async (req, res) => {
    const { username } = req.body; // Le nom d'utilisateur est envoyé dans le corps de la requête
    const newCapture = req.file ? req.file.path : null; // Récupérer le fichier téléchargé

    // Vérifier si l'utilisateur existe déjà
    const sqlSelect = 'SELECT * FROM user WHERE Login = ?';
    db.query(sqlSelect, [username], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur serveur lors de la vérification de l\'utilisateur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Gérer l'absence de nouvelle capture (photo de profil)
        if (!newCapture) {
            return res.status(400).json({ message: 'Aucune nouvelle photo de profil fournie' });
        }

        // Retirer le chemin du système de fichiers si nécessaire
        let pdpValue = newCapture.replace('/var/www/html/', ''); 
        const imageUrl = `../${pdpValue}`; // Construction de l'URL pour la nouvelle image

        // Mettre à jour la photo de profil dans la base de données
        const sqlUpdate = 'UPDATE user SET PDP = ? WHERE Login = ?';
        db.query(sqlUpdate, [imageUrl, username], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: 'Erreur lors de la mise à jour de la photo de profil' });
            }

            res.status(200).json({ message: 'Photo de profil mise à jour avec succès' });
        });
    });
});

//-------------------Changer Mot De Passe--------------------------//

app.put('/changer-motdepasse', async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;

    if (!username || !oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Veuillez fournir toutes les informations requises.' });
    }

    // Rechercher l'utilisateur dans la base de données
    const sqlSelect = 'SELECT * FROM user WHERE Login = ?';
    db.query(sqlSelect, [username], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur serveur lors de la recherche de l\'utilisateur.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        const user = results[0];

        // Vérifier si l'ancien mot de passe est correct
        const passwordMatch = bcrypt.compareSync(oldPassword, user.MDP);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'L\'ancien mot de passe est incorrect.' });
        }

        // Hasher le nouveau mot de passe
        const hashedNewPassword = bcrypt.hashSync(newPassword, 10);

        // Mettre à jour le mot de passe dans la base de données
        const sqlUpdate = 'UPDATE user SET MDP = ? WHERE Login = ?';
        db.query(sqlUpdate, [hashedNewPassword, username], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Erreur lors de la mise à jour du mot de passe.' });
            }

            res.status(200).json({ message: 'Mot de passe mis à jour avec succès.' });
        });
    });
});

//---------------------------------Changer Nom------------------------------------------//

app.put('/changer-nom', (req, res) => {
    const { username, newUsername } = req.body;

    if (!username || !newUsername) {
        return res.status(400).json({ message: 'Veuillez fournir les deux noms d\'utilisateur.' });
    }

    // Vérifier si le nouveau nom d'utilisateur existe déjà
    const sqlCheck = 'SELECT * FROM user WHERE Login = ?';
    db.query(sqlCheck, [newUsername], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur serveur lors de la vérification du nouveau nom d\'utilisateur.' });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'Le nouveau nom d\'utilisateur est déjà pris.' });
        }

        // Mettre à jour le nom d'utilisateur
        const sqlUpdate = 'UPDATE user SET Login = ? WHERE Login = ?';
        db.query(sqlUpdate, [newUsername, username], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Erreur lors de la mise à jour du nom d\'utilisateur.' });
            }

            res.status(200).json({ message: 'Nom d\'utilisateur mis à jour avec succès.' });
        });
    });
});


// Démarrer le serveur
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});