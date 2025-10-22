// ========================================
// HOSTAWAY CRM - MAIN SERVER
// This is the brain of your application!
// ========================================

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware - helps the server understand different types of data
app.use(cors()); // Allows your phone/computer to talk to the server
app.use(express.json()); // Understands JSON data
app.use(express.static('public')); // Serves your website files

// ===================
// DATABASE MODELS
// ===================

// User Model - stores information about team members
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Manager', 'Agent'], default: 'Agent' },
    avatar: { type: String, default: '👤' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Case Model - stores customer support cases
const caseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['open', 'in-progress', 'completed', 'closed'],
        default: 'open'
    },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    propertyName: String,
    hostawayReservationId: String,
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: String,
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Case = mongoose.model('Case', caseSchema);

// Task Model - stores tasks for team members
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    status: { 
        type: String, 
        enum: ['open', 'in-progress', 'completed'],
        default: 'open'
    },
    priority: { 
        type: String, 
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dueDate: Date,
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
    createdAt: { type: Date, default: Date.now }
});

const Task = mongoose.model('Task', taskSchema);

// Hostaway Connection Model - stores API credentials
const hostawaySchema = new mongoose.Schema({
    apiKey: { type: String, required: true },
    isConnected: { type: Boolean, default: false },
    lastSync: Date,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const HostawayConnection = mongoose.model('HostawayConnection', hostawaySchema);

// ===================
// API ROUTES
// ===================

// Health check - test if server is running
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running!' });
});

// ----- USER ROUTES -----

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new user
app.post('/api/users', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ----- CASE ROUTES -----

// Get all cases
app.get('/api/cases', async (req, res) => {
    try {
        const cases = await Case.find()
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email avatar')
            .populate('comments.user', 'name avatar')
            .sort({ updatedAt: -1 });
        res.json(cases);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a single case
app.get('/api/cases/:id', async (req, res) => {
    try {
        const case_ = await Case.findById(req.params.id)
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email avatar')
            .populate('comments.user', 'name avatar');
        if (!case_) {
            return res.status(404).json({ error: 'Case not found' });
        }
        res.json(case_);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new case
app.post('/api/cases', async (req, res) => {
    try {
        const case_ = new Case(req.body);
        await case_.save();
        const populated = await Case.findById(case_._id)
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email avatar');
        res.status(201).json(populated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update a case
app.put('/api/cases/:id', async (req, res) => {
    try {
        req.body.updatedAt = new Date();
        const case_ = await Case.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        )
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email avatar');
        if (!case_) {
            return res.status(404).json({ error: 'Case not found' });
        }
        res.json(case_);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a case
app.delete('/api/cases/:id', async (req, res) => {
    try {
        const case_ = await Case.findByIdAndDelete(req.params.id);
        if (!case_) {
            return res.status(404).json({ error: 'Case not found' });
        }
        res.json({ message: 'Case deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a comment to a case
app.post('/api/cases/:id/comments', async (req, res) => {
    try {
        const case_ = await Case.findById(req.params.id);
        if (!case_) {
            return res.status(404).json({ error: 'Case not found' });
        }
        
        case_.comments.push(req.body);
        case_.updatedAt = new Date();
        await case_.save();
        
        const populated = await Case.findById(case_._id)
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email avatar')
            .populate('comments.user', 'name avatar');
        
        res.json(populated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ----- TASK ROUTES -----

// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find()
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email avatar')
            .sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new task
app.post('/api/tasks', async (req, res) => {
    try {
        const task = new Task(req.body);
        await task.save();
        const populated = await Task.findById(task._id)
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email avatar');
        res.status(201).json(populated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update a task
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        )
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email avatar');
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----- HOSTAWAY ROUTES -----

// Connect to Hostaway
app.post('/api/hostaway/connect', async (req, res) => {
    try {
        const { apiKey, userId } = req.body;
        
        // In production, you would verify the API key with Hostaway here
        // For now, we'll just save it
        
        let connection = await HostawayConnection.findOne({ userId });
        
        if (connection) {
            connection.apiKey = apiKey;
            connection.isConnected = true;
            connection.lastSync = new Date();
        } else {
            connection = new HostawayConnection({
                apiKey,
                userId,
                isConnected: true,
                lastSync: new Date()
            });
        }
        
        await connection.save();
        res.json({ message: 'Connected to Hostaway successfully', isConnected: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Check Hostaway connection status
app.get('/api/hostaway/status/:userId', async (req, res) => {
    try {
        const connection = await HostawayConnection.findOne({ userId: req.params.userId });
        if (connection && connection.isConnected) {
            res.json({ isConnected: true, lastSync: connection.lastSync });
        } else {
            res.json({ isConnected: false });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Sync with Hostaway
app.post('/api/hostaway/sync', async (req, res) => {
    try {
        const { userId } = req.body;
        const connection = await HostawayConnection.findOne({ userId });
        
        if (!connection || !connection.isConnected) {
            return res.status(400).json({ error: 'Not connected to Hostaway' });
        }
        
        // In production, you would make actual API calls to Hostaway here
        // Example: fetch reservations, properties, guest data
        // const axios = require('axios');
        // const response = await axios.get('https://api.hostaway.com/v1/listings', {
        //     headers: { 'Authorization': `Bearer ${connection.apiKey}` }
        // });
        
        connection.lastSync = new Date();
        await connection.save();
        
        res.json({ 
            message: 'Sync completed successfully',
            lastSync: connection.lastSync,
            // In production, return the synced data
            data: {
                reservations: [],
                properties: [],
                guests: []
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----- STATISTICS ROUTES -----

// Get dashboard statistics
app.get('/api/stats', async (req, res) => {
    try {
        const totalCases = await Case.countDocuments();
        const openCases = await Case.countDocuments({ status: 'open' });
        const inProgressCases = await Case.countDocuments({ status: 'in-progress' });
        const completedCases = await Case.countDocuments({ status: 'completed' });
        const highPriorityCases = await Case.countDocuments({ priority: 'high' });
        
        const totalTasks = await Task.countDocuments();
        const openTasks = await Task.countDocuments({ status: 'open' });
        const completedTasks = await Task.countDocuments({ status: 'completed' });
        
        res.json({
            cases: {
                total: totalCases,
                open: openCases,
                inProgress: inProgressCases,
                completed: completedCases,
                highPriority: highPriorityCases
            },
            tasks: {
                total: totalTasks,
                open: openTasks,
                completed: completedTasks
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===================
// DATABASE CONNECTION & SERVER START
// ===================

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hostaway-crm';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        
        // Start the server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📊 API available at http://localhost:${PORT}/api`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server...');
    mongoose.connection.close();
    process.exit(0);
});
