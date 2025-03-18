import express from "express";
import {
    getAllBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
    getBlogBySlug
} from "../controllers/blogController.js";

const router = express.Router();

router.get("/all", getAllBlogs);
router.get("/:blogId", getBlogById);
router.get("/slug/:slug",getBlogBySlug);
router.post("/create", createBlog);
router.put("/:blogId", updateBlog);
router.delete("/:blogId", deleteBlog);

export default router;
