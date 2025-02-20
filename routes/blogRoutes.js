import express from "express";
import {
    getAllBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog
} from "../controllers/blogController.js";

const router = express.Router();

router.get("/all", getAllBlogs);
router.get("/:blogId", getBlogById);
router.post("/create", createBlog);
router.put("/:blogId", updateBlog);
router.delete("/:blogId", deleteBlog);

export default router;
