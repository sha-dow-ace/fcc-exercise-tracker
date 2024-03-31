const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'exercise_tracker'
});

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true }
},
// to not show __v:0
{versionKey: false}
);
const UserName = mongoose.model("UserName", userSchema);

const exerciseSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: Date,
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(express.urlencoded({extended: true}));

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get("/api/users", async (req, res) => {
  const users = await UserName.find().select("_id username");
  res.send(users);
});

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  const findUser = await UserName.findOne({username});
  if(findUser){
    res.json(findUser);
    return;
  }
  const user = await UserName.create({username});
  // res.json(user);
  res.send(user);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;
  const user = await UserName.findById(id);
  if(!user){
    res.send("User doesn't exist.");
    return;
  }
  const exerciseObj = {
    user_id: user._id,
    description,
    duration,
    date: date ? new Date(date) : new Date()
  };
  const exercise = await Exercise.create(exerciseObj);
  res.json({
    _id: user._id,
    username: user.username,
    description: exercise.description,
    date: new Date(exercise.date).toDateString()
  });
});

app.get("/api/users/:_id/logs", async (req, res) =>{
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await UserName.findById(id);
  if(!user){
    res.send("User doesn't exist.");
    return;
  }
  let dateObj = {};
  if(from){
    dateObj["$gte"] = new Date(from);
  }
  if(to){
    dateObj["$lte"] = new Date(to);
  }
  let filter = {
    user_id: id,
  }
  if(from || to){
    filter.date = dateObj;
  }
  const exercises = await Exercise.find(filter).limit(+limit ?? 500);

  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    // date: e.date.toDateString()
    date: e.date ? e.date.toDateString() : null,
  }));

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
