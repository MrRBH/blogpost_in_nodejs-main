const { Router, express } = require("express");
const router = Router();
const path = require('path');
const multer = require('multer');
const Blog = require("../models/blog");
const Comment = require("../models/Comment");
const { cachedDataVersionTag } = require("v8");
const Category = require("../models/categories");
// router.use(express.static(path.resolve("./public/")))
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve('./public/upload/'));
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`); // Corrected filename function
    }
});

const upload = multer({ storage });


router.get("/add-new", async (req, res) => {
    try {
        const blog  = await Blog.find()
        const categories = await Category.find(); // Fetch categories from the database
        res.render("addBlog", { user: req.user, categories ,blog}); // Pass categories to the view
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send('Server Error');
    }
});

router.post("/", upload.single('uploadImage'), async (req, res) => {
    try {
        const { title, body, categories, Active } = req.body;
        const blog = new Blog({
            title,
            body,
            userid: req.user._id,
            CoverImage: `upload/${req.file.filename}`,
            Active:req.body.Active,
            categories:req.body.categories,
            Tags:req.body.Tags
        });
        
        await blog.save();
        res.redirect(`/blog/${blog._id}`);
    } catch (error) {
        console.error('Error creating blog post:', error);
        res.status(500).send('Server Error of category');
    }
});
// Middleware to check authentication
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

router.delete('/blogDelete/:blogId', ensureAuthenticated, async (req, res) => {
    try {
        const { blogId } = req.params;
        const blogPost = await Blog.findById(blogId);

        if (!blogPost) {
            return res.status(404).send({ msg: "Post Not Found" });
        }

        if (blogPost.user.toString() !== req.user._id.toString()) {
            return res.status(403).send({ msg: "This post is not owned by you" });
        }

        await Blog.findByIdAndDelete(blogId);
        res.status(200).send({ msg: "Post Deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).send({ msg: "Post Not Deleted" });
    }
});
router.patch("blogUpdate/:blogId",async (req,res)=>{
    try {
        const {blogId} = req.params;
        const {title,body} = req.body
    
        if (!mongoose.Types.ObjectId.isValid(blogId)) {
            return res.status(400).send({ msg: "Invalid blogId!" });
          }
          const PostUpdate = await Blog.findByIdAndUpdate(blogId ,{$set:{title,body}},{new:true})
          if (PostUpdate) {
            return res.status(400).send({ msg: "BlogPost Not Found!" });
          }
          res.status(200).send({ msg: "BlogPost updated!",  });
    } catch (error) {
        console.error(error);
        res.status(500).send({msg:"Post Not Update "}) 
    }
   
})
router.get('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
       
        
        const comments = await Comment.find({ blogId: req.params.id }).populate(
            "userId"
        );

        if(!comments){
            return res.status(404).send('comments not fetched successfully please recheck').json({message:'comments not fetched successfully please recheck'})
        }
        // console.log(blog);
        if (!blog) {
            return res.status(404).send('Blog post not found');
        }
        res.render('viewblog', { user: req.user.id, blog, comments }); // Pass a single blog post
    } catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).send('Server Error');
    }
});
//Comment routes
router.post("/comment/:blogId", async (req, res) => {
    try {
        await Comment.create({
            content: req.body.content,
            blogId: req.params.blogId,
            userId: req.user._id,
        });
        return res.redirect(`/blog/${req.params.blogId}`);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).send('Server Error');
    }
});

//likes
// POST route to like a blog post
router.post('/like/:blogId', async (req, res) => {
    const { blogId } = req.params;
    const userId = req.user._id; // Assuming userId is available in req.user

    try {
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        if (!blog.likes.includes(userId)) {
            blog.likes.push(userId);
            blog.likesCount += 1;
            await blog.save();
            res.json({ success: true, updatedBlog: blog });
        } else {
            res.json({ success: false, message: 'Already liked' });
        }
    } catch (err) {
        console.error('Error liking blog:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST route to unlike a blog post
router.post('/unlike/:blogId', async (req, res) => {
    const { blogId } = req.params;
    const userId = req.user._id; // Assuming userId is available in req.user

    try {
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        if (blog.likes.includes(userId)) {
            blog.likes.pull(userId); // Remove userId from likes array
            blog.likesCount -= 1;
            await blog.save();
            res.json({ success: true, updatedBlog: blog });
        } else {
            res.json({ success: false, message: 'Not liked yet' });
        }
    } catch (err) {
        console.error('Error unliking blog:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post("/category/:blogId",async(req,res)=>{
    try {
        const category =  await Category.create({
            name:req.body.category,
            blogId:req.params.blogId,
            userId: req.user._id,
        })
      
        res.status(201).send(category);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).send('Server Error');
    }
});
// router.get('/:category', async (req, res) => {
//     try {
//         const category = req.params.category;
//         const blogs = await Blog.find({ category: category, Active: "Publish" });
//         res.render('home', { user: req.user, blogs: blogs, category: category });
//     } catch (error) {
//         console.error('Error fetching blogs by category:', error);
//         res.status(500).send('Posts Not founds');
//     }
// });


module.exports = router;
 