import sql from "../config/db.js";

// ✅ Fetch all blogs
export async function getAllBlogs(req, res) {
    try {
        const blogs = await sql`
            SELECT * FROM blogs ORDER BY created_at DESC;
        `;

        res.status(200).send({
            message: "Blogs fetched successfully",
            data: blogs,
        });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send({
            message: "Error fetching blogs",
            error,
        });
    }
}

// ✅ Fetch a single blog by ID
export async function getBlogById(req, res) {
    const { blogId } = req.params;

    try {
        const blog = await sql`
            SELECT * FROM blogs WHERE id = ${parseInt(blogId, 10)};
        `;

        if (blog.length === 0) {
            return res.status(404).send({ message: "Blog not found" });
        }

        res.status(200).send({
            message: "Blog fetched successfully",
            data: blog[0],
        });
    } catch (error) {
        console.error("Error fetching blog:", error);
        res.status(500).send({
            message: "Error fetching blog",
            error,
        });
    }
}

// ✅ Create a new blog
export async function createBlog(req, res) {
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).send({
            message: "Title and content are required",
        });
    }

    try {
        const result = await sql`
            INSERT INTO blogs (title, content)
            VALUES (${title}, ${content})
            RETURNING *;
        `;

        res.status(201).send({
            message: "Blog created successfully",
            data: result[0],
        });
    } catch (error) {
        console.error("Error creating blog:", error);
        res.status(500).send({
            message: "Error creating blog",
            error,
        });
    }
}

// ✅ Update an existing blog
export async function updateBlog(req, res) {
    const { blogId } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).send({
            message: "Title and content are required to update the blog",
        });
    }

    try {
        const existingBlog = await sql`
            SELECT * FROM blogs WHERE id = ${parseInt(blogId, 10)};
        `;

        if (existingBlog.length === 0) {
            return res.status(404).send({ message: "Blog not found" });
        }

        const result = await sql`
            UPDATE blogs
            SET title = ${title}, content = ${content}
            WHERE id = ${parseInt(blogId, 10)}
            RETURNING *;
        `;

        res.status(200).send({
            message: "Blog updated successfully",
            data: result[0],
        });
    } catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).send({
            message: "Error updating blog",
            error,
        });
    }
}

// ✅ Delete a blog
export async function deleteBlog(req, res) {
    const { blogId } = req.params;

    try {
        const existingBlog = await sql`
            SELECT * FROM blogs WHERE id = ${parseInt(blogId, 10)};
        `;

        if (existingBlog.length === 0) {
            return res.status(404).send({ message: "Blog not found" });
        }

        await sql`
            DELETE FROM blogs WHERE id = ${parseInt(blogId, 10)};
        `;

        res.status(200).send({
            message: "Blog deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting blog:", error);
        res.status(500).send({
            message: "Error deleting blog",
            error,
        });
    }
}
