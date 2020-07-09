const express = require('express');
const app = express();
const github = require('./routes/github');
const cors = require('cors');
const bodyParser = require('body-parser');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true,limit:'10mb' }));
app.use(cors());

app.use('/github', github);

const port = process.env.PORT || 5001;
app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`);
})

app.get('/', function (req, res) {
    res.send('Currently working!');
});
