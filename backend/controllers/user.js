import { UserModel } from '../models/user.js'
import { LocationModel } from '../models/location.js'
import pkg from 'validator'
import multer from 'multer'
import path from 'path'
const { isEmail } = pkg // https://www.npmjs.com/package/validator
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs'



// POST - Create a new user
export const createAccount = async (req, res) => {
    const { name, surname, username, email, password } = req.body;
    if (!name || !surname || !username || !email || !password) { // Prevent crash if user doesn't fill all fields
        return res.status(400).send({ message: 'Por favor, preencha todos os campos' });
    }
    if (!username) {
        return res.status(400).send({ message: 'Por favor, preencha o campo username' });
    }
    const user = await UserModel.findOne({ where: { username: username } }); // Verify if username already exists
    const userEmail = await UserModel.findOne({ where: { email: email } }); // Verify if email already exists
    const validEmail = isEmail(email); // Verify if email is valid email 
    if (user) {
        return res.status(400).send({ message: 'Este username já está a ser utilizado' });
    } else if (userEmail) {
        return res.status(400).send({ message: 'Este email já está a ser utilizado' });
    } else if (!validEmail) {
        return res.status(400).send({ message: 'Por favor, introduza um email válido' });
    } else {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        // const joinedDate = moment().format('DD/MM/YYYY');
        const newUser = await UserModel.create({ name, surname, username, email, password: hashedPassword });

        // create and assign a token
        const token = jwt.sign({ _id: newUser.id }, process.env.TOKEN_SECRET);

        return res.status(201).send({ newUser, token });
    }
}

// POST - Login controller
export const login = async (req, res) => {
    const { username, password } = req.body
    if (!username || !password) {
        return res.status(400).send({ message: 'Por favor, preencha todos os campos' });
    }
    const user = await UserModel.findOne({ where: { username: username } })
    if (!user) {
        res.status(400).send({ message: 'Este username não existe' })
    } else {
        const validPass = await bcrypt.compare(password, user.password)
        if (!validPass) {
            res.status(400).send({ message: 'Password incorreta, tente novamente' })
        } else {
            // create and assign a token
            const token = jwt.sign({ _id: user.id }, process.env.TOKEN_SECRET)
            res.status(200).send({ message: 'Bem-vindo', token })
        }
    }
}

// GET - Get all users
export const getAllUsers = async (req, res) => {
    const users = await UserModel.findAll({ attributes: { exclude: ['password', 'profilePicture'] } })
    const usersWithLocation = await Promise.all(users.map(async (user) => {
        if (user.locationId) {
            const location = await LocationModel.findOne({ where: { id: user.locationId } })
            return { ...user.dataValues, locationName: location.description }
        } else {
            return { ...user.dataValues, locationName: null }
        }
    }))
    res.status(200).send(usersWithLocation)
}


// GET - Get user by username
export const getUserByUsername = async (req, res) => {
    const { username } = req.body
    if (username) {
        const user = await UserModel.findOne({ where: { username: username }, attributes: { exclude: ['password', 'profilePicture'] } })
        if (user) {
            if (user.locationId) {
                const location = await LocationModel.findOne({ where: { id: user.locationId } })
                res.status(200).send({ ...user.dataValues, locationName: location.description })
            } else {
                res.status(200).send({ ...user.dataValues, locationName: null })
            }
        } else {
            res.status(404).send('User not found')
        }
    } else {
        res.status(400).send('Por favor, preencha o campo username')
    }
}

// GET - Get user by id only dont exlude any attribute, and add location name to user object if locationId exists
export const getUserById = async (req, res) => {
    const { id } = req.params
    const user = await UserModel.findOne({ where: { id: id } })
    if (user) {
        if (user.locationId) {
            const location = await LocationModel.findOne({ where: { id: user.locationId } })
            res.status(200).send({ ...user.dataValues, locationName: location.description })
        } else {
            res.status(200).send({ ...user.dataValues, locationName: null })
        }
    } else {
        res.status(404).send('User not found')
    }
}

// PUT - Update location of user by id, user write location name and we find locationId by location name and update it in user verify if location exists
export const updateLocation = async (req, res) => {
    try {
        const { id } = req.params
        const { locationName } = req.body
        const userExist = await UserModel.findOne({ where: { id: id } })
        if (userExist) {
            const location = await LocationModel.findOne({ where: { description: locationName } })
            if (location) {
                await UserModel.update({ locationId: location.id }, { where: { id: id } })
                res.status(200).send({ message: 'Localização atualizada com sucesso' })
            } else {
                res.status(404).send({ message: 'Localização não encontrada' })
            }
        } else {
            res.status(404).send({ message: 'User not found' })
        }
    } catch (error) {
        res.status(500).send({ message: 'Error updating location', error: error.message });
    }
}

// PUT- Update profile picture of user by id, image is uploaded to uploads folder and path is saved in database, if user already has a profile picture, delete the old one, and save the new one in database and in uploads folder 
export const updateProfilePicture = async (req, res) => {
    try {
        const { id } = req.params
        const userExist = await UserModel.findOne({ where: { id: id } })
        console.log('------------------' + req.file)
        if (userExist) {
            if (userExist.profilePicture !== 'default.png') {
                fs.unlinkSync(`uploads/users/${userExist.profilePicture}`)
            }
            await UserModel.update({ profilePicture: req.file.filename }, { where: { id: id } })
            res.status(200).send({ message: 'Foto de perfil atualizada com sucesso' })
        } else {
            res.status(404).send({ message: 'User not found' })
        }
    } catch (error) {
        res.status(500).send({ message: 'Error updating profile picture', error: error.message });
    }
}

// PUT - Update profile picture to default.png if user has a profile picture name different from default.png
export const updateProfilePictureToDefault = async (req, res) => {
    try {
        const { id } = req.params
        const userExist = await UserModel.findOne({ where: { id: id } })
        if (userExist) {
            if (userExist.profilePicture !== 'default.png') {
                fs.unlinkSync(`uploads/${userExist.profilePicture}`)
                await UserModel.update({ profilePicture: 'default.png' }, { where: { id: id } })
                res.status(200).send({ message: 'Foto de perfil atualizada com sucesso' })
            } else {
                res.status(200).send({ message: 'Foto de perfil já é a padrão' })
            }
        } else {
            res.status(404).send({ message: 'User not found' })
        }
    } catch (error) {
        res.status(500).send({ message: 'Error updating profile picture', error: error.message });
    }
}

// DELETE - Delete user by id, if user has a profile picture name different from default.png, delete the profile picture from uploads folder
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params
        const userExist = await UserModel.findOne({ where: { id: id } })
        if (userExist) {
            if (userExist.profilePicture !== 'default.png') {
                fs.unlinkSync(`uploads/${userExist.profilePicture}`)
            }
            await UserModel.destroy({ where: { id: id } })
            res.status(200).send({ message: 'User deleted successfully' })
        } else {
            res.status(404).send({ message: 'User not found' })
        }
    } catch (error) {
        res.status(500).send({ message: 'Error deleting user', error: error.message });
    }
}

// PUT - Update name of user by id
export const updateName = async (req, res) => {
    try {
        const { id } = req.params
        const { name } = req.body
        const userExist = await UserModel.findOne({ where: { id: id } })
        if (userExist) {
            if (name === '') {
                res.status(200).send({ ...userExist.dataValues, locationName: userExist.locationId ? await LocationModel.findOne({ where: { id: userExist.locationId } }) : null })
            } else {
                await UserModel.update({ name: name }, { where: { id: id } })
                const user = await UserModel.findOne({ where: { id: id } })
                const location = await LocationModel.findOne({ where: { id: user.locationId } })
                res.status(200).send({ ...user.dataValues, locationName: location ? location.description : null })
            }
        } else {
            res.status(404).send({ message: 'User not found' })
        }
    } catch (error) {
        res.status(500).send({ message: 'Error updating name', error: error.message });
    }
}

// PUT - Update surname of user by id
export const updateSurname = async (req, res) => {
    try {
        const { id } = req.params
        const { surname } = req.body
        const userExist = await UserModel.findOne({ where: { id: id } })
        if (userExist) {
            if (surname === '') {
                res.status(200).send({ ...userExist.dataValues, locationName: userExist.locationId ? await LocationModel.findOne({ where: { id: userExist.locationId } }) : null })
            } else {
                await UserModel.update({ surname: surname }, { where: { id: id } })
                const user = await UserModel.findOne({ where: { id: id } })
                const location = await LocationModel.findOne({ where: { id: user.locationId } })
                res.status(200).send({ ...user.dataValues, locationName: location ? location.description : null })
            }
        } else {
            res.status(404).send({ message: 'User not found' })
        }
    } catch (error) {
        res.status(500).send({ message: 'Error updating surname', error: error.message });
    }
}

// PUT- Update email of user by id, verify if email already exists, if not, verify if email is valid, if email is valid, update email and return user with updated email and location name if user has a location id
export const updateEmail = async (req, res) => {
    try {
        const { id } = req.params
        const { email } = req.body
        const userExist = await UserModel.findOne({ where: { id: id } })
        if (userExist) {
            if (email === '') {
                res.status(200).send({ ...userExist.dataValues, locationName: userExist.locationId ? await LocationModel.findOne({ where: { id: userExist.locationId } }) : null })
            } else {
                const emailExist = await UserModel.findOne({ where: { email: email } })
                if (emailExist) {
                    res.status(200).send({ message: 'Email já existe' })
                } else {
                    if (isEmail(email)) {
                        const updatedUser = await UserModel.update({ email: email }, { where: { id: id } })
                        const user = await UserModel.findOne({ where: { id: id } })
                        res.status(200).send({ ...user.dataValues, locationName: user.locationId ? await LocationModel.findOne({ where: { id: user.locationId } }) : null })
                    } else {
                        res.status(200).send({ message: 'Email inválido' })
                    }
                }
            }
        } else {
            res.status(404).send({ message: 'Usuário não encontrado' })
        }
    } catch (error) {
        res.status(500).send({ message: 'Erro ao atualizar email' })
    }
}

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, surname, name, locationName, birthDate } = req.body;

        const userExist = await UserModel.findOne({ where: { id: id } });
        if (!userExist) {
            return res.status(404).send({ message: 'User not found' });
        }

        let updatedUser = {};
        let location;
        if (email && email !== ' ' && email !== undefined && email !== null) {
            const emailExist = await UserModel.findOne({ where: { email: email } });
            if (emailExist) {
                return res.status(200).send({ message: 'Email já existe' });
            } else if (!isEmail(email)) {
                return res.status(200).send({ message: 'Email inválido' });
            } else {
                updatedUser.email = email;
            }
        }
        if (surname && surname.trim().length !== 0 && surname !== undefined && surname !== null) {
            updatedUser.surname = surname.trim();
        } else if (surname && surname.trim().length === 0) {
            return res.status(400).send({ message: 'Surname cannot be empty or contain only whitespaces' });
        }
        if (name && name.trim().length !== 0 && name !== undefined && name !== null) {
            updatedUser.name = name.trim();
        } else if (name && name.trim().length === 0) {
            return res.status(400).send({ message: 'Name cannot be empty or contain only whitespaces' });
        }
        if (locationName && locationName !== '') {
            location = await LocationModel.findOne({ where: { description: locationName } });
            if (!location) {
                return res.status(404).send({ message: 'Location not found' });
            } else {
                updatedUser.locationId = location.id;
            }
        }
        if (birthDate && birthDate !== '') {
            // Split the date on "-" to get individual parts
            const dateParts = birthDate.split('T')[0].split('-');

            // Reorder the parts to the desired format "DD-MM-YYYY"
            const date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

            // Assign the formatted date to the updatedUser object
            updatedUser.birthDate = date;
        }

        if (Object.keys(updatedUser).length > 0) {
            await UserModel.update(updatedUser, { where: { id: id } });
        }
        const updatedUserInstance = await UserModel.findOne({ where: { id: id } });
        location = updatedUserInstance.locationId
            ? await LocationModel.findOne({ where: { id: updatedUserInstance.locationId } })
            : null;

        return res
            .status(200)
            .send({ ...updatedUserInstance.dataValues, locationName: location ? location.description : null });
    } catch (error) {
        return res.status(500).send({ message: 'Error updating user', error: error.message });
    }
};





//  Image Upload

// Set up storage engine for multer
export const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/users')
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname))
    }
})


// Set up multer to upload the image
export const upload = multer({
    storage: storage,
    limits: { fileSize: '1000000' },
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|gif/
        const mimeType = fileTypes.test(file.mimetype)
        const extname = fileTypes.test(path.extname(file.originalname))

        if (mimeType && extname) {
            return cb(null, true)
        }
        cb('Give proper files formate to upload')
    }
}).single('profilePicture')






