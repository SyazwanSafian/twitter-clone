import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, storage } from "../../firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

//Async thunk for fetching a user's posts
export const fetchPostsByUser = createAsyncThunk(
    "posts/fetchByUser",
    async (userId) => {
        try {
            const postsRef = collection(db, `users/${userId}/posts`);

            const querySnapshot = await getDocs(postsRef);
            const docs = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            return docs;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
);

export const savePost = createAsyncThunk(
    "posts/savePost",
    async ({ userId, postContent, file }) => {
        try {
            let imageUrl = "";
            console.log(file);
            if (file !== null) {
                const imageRef = ref(storage, `posts/${file.name}`);
                const response = await uploadBytes(imageRef, file);
                imageUrl = await getDownloadURL(response.ref);
            }
            const postsRef = collection(db, `users/${userId}/posts`);
            console.log(`users/${userId}/posts`);
            //since no ID is given, Firestore auto generate a unique ID for this new document
            const newPostRef = doc(postsRef);
            console.log(postContent);
            await setDoc(newPostRef, { content: postContent, likes: [], imageUrl });
            const newPost = await getDoc(newPostRef);

            const post = {
                id: newPost.id,
                ...newPost.data(),
            };

            return post;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

);

export const updatePost = createAsyncThunk(
    "posts/updatePost",
    async ({ userId, postId, newPostContent, newFile }) => {
        try {
            //upload the new file to the storage if it exists and get its URL
            let newImageUrl;
            if (newFile) {
                const imageRef = ref(storage, `posts/${newFile, name}`);
                const response = await uploadBytes(imageRef, newFile);
                newImageUrl = await getDownloadURL(response.ref);
            }
            //reference to the existing post
            const postRef = doc(db, `users/${userId}/posts/${postId}`);
            //get the current post data
            const postSnap = await getDoc(postRef);
            if (postSnap.exists()) {
                const postData = postSnap.data();
                //update the post content and the image URL
                const updatedData = {
                    ...postData,
                    content: newPostContent || postData.content,
                    imageUrl: newImageUrl || postData.imageUrl,
                };
                //update the existing doc in Firestore
                await updateDoc(postRef, updatedData)
                //return the post with updated data
                const updatedPost = { id: postId, ...updatedData };
                return updatedPost;
            } else {
                throw new Error("Post does not exist");
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
);

export const deletePost = createAsyncThunk(
    "posts/deletePost",
    async ({ userId, postId }) => {
        try {
            //reference to the post
            const postRef = doc(db, `users/${userId}/posts/${postId}`);
            //delete the post
            await deleteDoc(postRef);
            //return the ID of the deleted post
            return postId;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
);

export const likePost = createAsyncThunk(
    "posts/likePost",
    async ({ userId, postId }) => {
        try {
            const postRef = doc(db, `users/${userId}/posts/${postId}`);
            const docSnap = await getDoc(postRef);

            if (docSnap.exists()) {
                const postData = docSnap.data();
                const likes = [...postData.likes, userId];

                await setDoc(postRef, { ...postData, likes });
            }
            return { userId, postId };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
);

export const removeLikeFromPost = createAsyncThunk(
    "posts/removeLikeFromPost",
    async ({ userId, postId }) => {
        try {
            const postRef = doc(db, `users/${userId}/posts/${postId}`);
            const docSnap = await getDoc(postRef);

            if (docSnap.exists()) {
                const postData = docSnap.data();
                const likes = postData.likes.filter((id) => id !== userId);

                await setDoc(postRef, { ...postData, likes });
            }
            return { userId, postId };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
);

const postsSlice = createSlice({
    name: "posts",
    initialState: { posts: [], loading: true },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPostsByUser.fulfilled, (state, action) => {
                state.posts = action.payload;
                state.loading = false;
            })
            .addCase(savePost.fulfilled, (state, action) => {
                state.posts = [action.payload, ...state.posts];
            })
            .addCase(likePost.fulfilled, (state, action) => {
                const { userId, postId } = action.payload;

                const postIndex = state.posts.findIndex((post) => post.id === postId);

                if (postIndex !== -1) {
                    state.posts[postIndex].likes.push(userId);
                }
            })
            .addCase(removeLikeFromPost.fulfilled, (state, action) => {
                const { userId, postId } = action.payload;

                const postIndex = state.posts.findIndex((post) => post.id === postId);

                if (postIndex !== -1) {
                    state.posts[postIndex].likes = state.posts[postIndex].likes.filter((id) => id !== userId
                    );
                }
            })
            .addCase(updatePost.fulfilled, (state, action) => {
                const updatedPost = action.payload;
                const postIndex = state.posts.findIndex((post) => post.id === updatedPost.id
                );
                if (postIndex !== - 1) {
                    state.posts[postIndex] = updatedPost;
                }
            })
            .addCase(deletePost.fulfilled, (state, action) => {
                const deletedPostId = action.payload;
                //filter out the deleted post from state
                state.posts = state.posts.filter((post) => post.id !== deletedPostId);
            });
    }
});

export default postsSlice.reducer;