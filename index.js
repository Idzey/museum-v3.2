let express = require(`express`);
let app = express();
let port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server has been started! ${port}`);
});

let hbs = require('hbs');
app.set('view engine', 'hbs');
app.set('views', 'views');

let mongoose = require(`mongoose`);
mongoose.connect("mongodb+srv://Admin:UcH-MF2-QnN-CtJ@museum.gro82ka.mongodb.net/museum");

app.use(express.static(`public`));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let articleSchema = new mongoose.Schema({
    title: String,
    category: Array,
    description: String,
    text: String,
    image: String
}, {
    timestamps: true
});

let Article = mongoose.model('article', articleSchema);

let imageSchema = new mongoose.Schema({
    title: String,
    img_src: String
}, {
    timestamps: true
});

let Image = mongoose.model('image', imageSchema);

let adminSchema = new mongoose.Schema({
    login: String,
    password: String
});

let Admin = mongoose.model('user', adminSchema);

let documentSchema = new mongoose.Schema({
    title: String,
    src: String
});

let Document = mongoose.model('document', documentSchema);

app.get(`/`, async (req, res) => {
    res.render(`index`);
});

app.get(`/articles`, async (req, res) => {
    let category = req.query.category;
    let title = req.query.title;
    let radio = Number(req.query.sort);
    

    let search = {};

    if (category) {
        search.category = category;
    }
    if (title) {
        search.title = {$regex: new RegExp(title, 'i')};
    }
    if (!radio) {
        radio = -1;
    }
    saveValue = {
        title: title,
        radioUp: radio == -1,
        radioDown: radio == 1
    }

    let select = `<option value="" selected>Все</option>`;
    let categories = ["Startup", "Business"];
    for (let i = 0; i < categories.length; i++) {
        if (categories[i] == category) {
            select += `<option value="${categories[i]}" selected>${categories[i]}</option>`;
        } else {
            select += `<option value="${categories[i]}">${categories[i]}</option>`;
        }
    }

    let data = await Article.find(search).sort({ createdAt: radio });

    let pageCount = Math.ceil(data.length / 10);
    let page = Number(req.query.page);
    if (!page) { page = 1;}
    if (page > pageCount) {
        page = pageCount
    }
    
    let node;

    if (pageCount > 1) {
        data = data.slice(page*10 - 10, page*10);
        
        node = `
        <div class="btn-toolbar" role="toolbar" aria-label="Toolbar with button groups">
            <div class="btn-group border border-3 me-2" role="group" aria-label="First group">
        `;
            for (let i = 1; i <= pageCount; i++) {
                let selected;
                if (i == page) {
                    selected = `btn-primary`;
                }

                if (title == undefined) {
                    title = ``;
                }
                if (category == undefined) {
                    category = ``;
                }

                node += `<a href="/articles?title=${title}&category=${category}&sort=${radio}&page=${i}" type="button" class="btn ${selected}">${i}</a>`;
            }
        node += `
            </div>
        </div>
        `;
    }

    res.render(`articles`, { articles: data, value: saveValue, select: select, pagination: node});
});

app.get('/articles/category', async (req,res) => {
    let category = req.query.category;
    let data;
    if (category) {
        data = await Article.find({category: category}).sort({createdAt: -1}).limit(3);
    } else{
        data = await Article.find().sort({createdAt: -1}).limit(3);
    }
    res.send(data);
});

app.get(`/article`, async (req, res) => {
    let id = req.query.id;

    try {
        let data = await Article.findOne({ _id: id });

        res.render(`article`, { article: data });
    } catch (err) {
        res.render(`404`);
    }
});


app.get(`/about`, async function (req, res) {
    res.render(`about`);
});

app.get(`/photos`, async function (req, res) {
    let images = await Image.find();
    res.render(`gallery`, { images: images });
});

app.get(`/documents`, async function (req,res) {
    let documents = await Document.find();
    res.render('documents', {documents: documents});
});





// ADMIN PANEL
let md5 = require(`md5`);
let session = require(`express-session`);
let multer = require(`multer`);


app.use(session({
    secret: `qwerty`,
    resave: true,
    saveUninitialized: true,
}));


let storageConfig1 = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/assets/photos");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

let storageConfig2 = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/assets/articles");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

let upload1 = multer({ storage: storageConfig1 });
let upload2 = multer({ storage: storageConfig2 });




app.get(`/admin`, async function (req, res) {
    if ((await Admin.find({ login: req.session.login, password: req.session.pass })).length > 0) {
        res.redirect(`/admin-link`);
    } else {
        let error = req.query.error;

        res.render(`login`, { err: error });
    }
});

app.get(`/admin-link`, async function (req, res) {
    if ((await Admin.find({ login: req.session.login, password: req.session.pass })).length > 0) {
        res.render(`admin-link`);
    } else {
        res.redirect(`/admin`);
    }
});

app.post(`/login`, async function (req, res) {
    let login = req.body.login;
    let password = req.body.password;
    login = login.replaceAll(' ', '');

    if (await Admin.findOne({ login: login })) {
        let admin = await Admin.findOne({ login: login });
        if (admin.password == md5(password)) {
            req.session.login = login;
            req.session.pass = md5(password);

            res.redirect(`/admin-link`);
        } else {
            res.redirect(`/admin?error=1`);
        }
    } else {
        res.redirect(`/admin?error=1`);
    }
});

app.get(`/create-image`, async function (req, res) {
    if ((await Admin.find({ login: req.session.login, password: req.session.pass })).length > 0) {
        let success = req.query.success;
        let error = req.query.error;
        let images = await Image.find();

        res.render(`create-image`, { images: images, success: success, error: error });
    } else {
        res.redirect(`/admin`);
    }
});

app.post(`/create-image`, upload1.single("filedata"), async function (req, res) {
    if ((await Admin.find({ login: req.session.login, password: req.session.pass })).length > 0) {
        try {
            let title = req.body.title;
            let img_src = 'assets/photos/' + req.file.originalname;

            let image = new Image({
                title: title,
                img_src: img_src
            });
            await image.save();

            let filedata = req.file;
            res.redirect(`/create-image?success=1`);
        } catch (err) {
            res.redirect(`/create-image?error=1`);
        }
    } else {
        res.redirect(`/admin`);
    }
});


app.get(`/create-document`, async function (req, res) {
    if ((await Admin.find({ login: req.session.login, password: req.session.pass })).length > 0) {
        let success = req.query.success;
        let error = req.query.error;
        let documents = await Document.find();

        res.render(`create-document`, { documents: documents, success: success, error: error });
    } else {
        res.redirect(`/admin`);
    }
});

app.post(`/create-document`, async function (req, res) {
    if ((await Admin.find({ login: req.session.login, password: req.session.pass })).length > 0) {
        try {
            let title = req.body.title;
            let src = req.body.url;

            let document = new Document({
                title: title,
                src: src
            });
            await document.save();
            res.redirect(`/create-document?success=1`);
        } catch (err) {
            res.redirect(`/create-document?error=1`);
        }
    } else {
        res.redirect(`/admin`);
    }
});


let fs = require(`fs`);

app.get('/delete-image', async function (req, res) {
    if ((await Admin.find({ login: req.session.login, password: req.session.pass })).length > 0) {
        let id = req.query.id;
        try {
            let image = await Image.findOne({ _id: id });
            fs.unlinkSync(`public/${image.img_src}`);
            await Image.deleteOne({ _id: id });
        } catch (err) {

        }
        res.redirect('back');
    } else {
        res.redirect(`/admin`);
    }
});

app.get(`/create-article`, async function (req, res) {
    if ((await Admin.find({ login: req.session.login, password: req.session.pass })).length > 0) {
        let data = await Article.find();

        res.render(`create-article`, { articles: data });
    } else {
        res.redirect(`/admin`);
    }
});

app.post(`/create-article`, upload2.single("filedata"), async function (req, res) {
    if ((await Admin.find({ login: req.session.login, password: req.session.pass })).length > 0) {
        let title = req.body.title;
        let image = 'assets/articles/' + req.file.originalname;
        let text = req.body.text;
        let description = req.body.description;
        let category = [];

        if (req.query.check_school = `On`) {
            category.push('Школа');
        }
        if (req.query.check_plant = `On`) {
            category.push('Завод');
        }

        let article = new Article({
            title: title,
            image: image,
            text: text,
            description: description,
            category: category
        });


        try {
            await article.save();
            let filedata = req.file;
            res.redirect(`/create-article?success=1`);
        } catch (err) {
            res.redirect(`/create-article?error=1`);
        }
    } else {
        res.redirect(`/admin`);
    }
});

app.get('/delete-article', async function (req, res) {
    if ((await Admin.find({ login: req.session.login, password: req.session.pass })).length > 0) {
        let id = req.query.id;
        try {
            let article = await Article.findOne({ _id: id });
            fs.unlinkSync(`public/${article.image}`);
            await Article.deleteOne({ _id: id });
        } catch (err) {

        }
        res.redirect('back');
    } else {
        res.redirect(`/admin`);
    }
});

app.get('/delete-document', async function (req, res) {
    if ((await Admin.find({ login: req.session.login, password: req.session.pass })).length > 0) {
        let id = req.query.id;
        try {
            await Document.deleteOne({ _id: id });
        } catch (err) {
            
        }
        res.redirect('back');
    } else {
        res.redirect(`/admin`);
    }
});



app.get(`*`, function (req,res) {
    res.render(`404`);
});