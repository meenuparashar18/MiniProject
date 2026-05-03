import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../apiService';

const EditPostPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const autosaveKey = `edit-post-${id}`;
  const [formData, setFormData] = useState({
    title: '',
    categories: '',
    tags: '',
    status: 'published',
    galleryImages: '',
    markdownContent: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [history, setHistory] = useState([]);
  const [aiLoading, setAiLoading] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const savedDraft = localStorage.getItem(autosaveKey);
        if (savedDraft) {
          setFormData(JSON.parse(savedDraft));
          setLoading(false);
          return;
        }

        const response = await apiService.get(`/posts/${id}`);
        const historyResponse = await apiService.get(`/posts/${id}/history`);
        const { title, categories, tags, status, markdownContent, galleryImages } = response.data;

        setFormData({
          title: title || '',
          categories: categories?.join(', ') || '',
          tags: tags?.join(', ') || '',
          status: status || 'published',
          galleryImages: galleryImages?.join('\n') || '',
          markdownContent: markdownContent || '',
        });
        setHistory(historyResponse.data.history || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load post.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [autosaveKey, id]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        localStorage.setItem(autosaveKey, JSON.stringify(formData));
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [autosaveKey, formData, loading]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      await apiService.patch(`/posts/${id}`, formData);
      localStorage.removeItem(autosaveKey);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update post.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImageUploading(true);
    setError('');

    try {
      const uploadData = new FormData();
      uploadData.append('image', file);

      const response = await apiService.post('/posts/upload-image', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFormData((currentData) => ({
        ...currentData,
        markdownContent: currentData.markdownContent
          ? `${currentData.markdownContent}\n\n${response.data.markdown}`
          : response.data.markdown,
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image.');
    } finally {
      setImageUploading(false);
      event.target.value = '';
    }
  };

  const handleAiTool = async (action) => {
    setAiLoading(action);
    setError('');

    try {
      const response = await apiService.post('/chat/writing-tools', {
        action,
        title: formData.title,
        content: formData.markdownContent,
        categories: formData.categories,
        tags: formData.tags,
      });

      const result = response.data.result || '';

      if (action === 'title') {
        const nextTitle = result.split('\n').find(Boolean)?.replace(/^Suggested title:\s*/i, '') || result;
        setFormData((current) => ({ ...current, title: nextTitle }));
      } else if (action === 'tags') {
        setFormData((current) => ({ ...current, tags: result.replace(/^Suggested tags:\s*/i, '') }));
      } else if (action === 'improve') {
        setFormData((current) => ({ ...current, markdownContent: result }));
      } else if (action === 'summarize') {
        setFormData((current) => ({
          ...current,
          markdownContent: current.markdownContent
            ? `${current.markdownContent}\n\n> ${result.replace(/^Summary:\s*/i, '')}`
            : result,
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'AI tool failed.');
    } finally {
      setAiLoading('');
    }
  };

  const handleRestoreRevision = async (revisionId) => {
    try {
      const response = await apiService.post(`/posts/${id}/history/${revisionId}/restore`);
      setFormData({
        title: response.data.title || '',
        categories: response.data.categories?.join(', ') || '',
        tags: response.data.tags?.join(', ') || '',
        status: response.data.status || 'published',
        galleryImages: response.data.galleryImages?.join('\n') || '',
        markdownContent: response.data.markdownContent || '',
      });
      const historyResponse = await apiService.get(`/posts/${id}/history`);
      setHistory(historyResponse.data.history || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore revision.');
    }
  };

  if (loading) {
    return <div className="admin-page">Loading post...</div>;
  }

  return (
    <section className="admin-page">
      <Helmet>
        <title>Edit Post | My Blog</title>
      </Helmet>

      <div className="admin-header">
        <div>
          <h1>Edit Post</h1>
          <p>Update the post content and publish your changes.</p>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      <form className="admin-form" onSubmit={handleSubmit}>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleChange}
          required
        />

        <label htmlFor="categories">Categories</label>
        <input
          id="categories"
          name="categories"
          type="text"
          value={formData.categories}
          onChange={handleChange}
          placeholder="React, JavaScript, Tutorials"
        />

        <label htmlFor="tags">Tags / Hashtags</label>
        <input
          id="tags"
          name="tags"
          type="text"
          value={formData.tags}
          onChange={handleChange}
          placeholder="frontend, markdown, productivity"
        />

        <label htmlFor="status">Post Status</label>
        <select id="status" name="status" value={formData.status} onChange={handleChange}>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <label htmlFor="markdownContent">Markdown Content</label>
        <div className="editor-tools">
          <label className="upload-chip" htmlFor="editPostImageUpload">
            {imageUploading ? 'Uploading image...' : 'Upload Image'}
          </label>
          <input
            id="editPostImageUpload"
            type="file"
            accept="image/*"
            className="hidden-file-input"
            onChange={handleImageUpload}
          />
          <span className="editor-hint">Uploads insert Markdown image syntax into your post.</span>
        </div>
        <div className="editor-tools">
          <button type="button" className="secondary-button" onClick={() => handleAiTool('title')} disabled={Boolean(aiLoading)}>
            {aiLoading === 'title' ? 'Generating...' : 'Generate Title'}
          </button>
          <button type="button" className="secondary-button" onClick={() => handleAiTool('improve')} disabled={Boolean(aiLoading)}>
            {aiLoading === 'improve' ? 'Polishing...' : 'Improve Draft'}
          </button>
          <button type="button" className="secondary-button" onClick={() => handleAiTool('summarize')} disabled={Boolean(aiLoading)}>
            {aiLoading === 'summarize' ? 'Summarizing...' : 'Summarize'}
          </button>
          <button type="button" className="secondary-button" onClick={() => handleAiTool('tags')} disabled={Boolean(aiLoading)}>
            {aiLoading === 'tags' ? 'Suggesting...' : 'Suggest Tags'}
          </button>
        </div>
        <div className="editor-split">
          <textarea
            id="markdownContent"
            name="markdownContent"
            value={formData.markdownContent}
            onChange={handleChange}
            rows="18"
            required
          />
          <div className="markdown-preview">
            <div className="markdown-preview-header">Live Preview</div>
            <div className="markdown-preview-body">
              {formData.markdownContent.trim() ? (
                <ReactMarkdown>{formData.markdownContent}</ReactMarkdown>
              ) : (
                <p className="editor-hint">Start writing to see a live preview here.</p>
              )}
            </div>
          </div>
        </div>

        <label htmlFor="galleryImages">Gallery Images</label>
        <textarea
          id="galleryImages"
          name="galleryImages"
          value={formData.galleryImages}
          onChange={handleChange}
          rows="4"
          placeholder="One image URL per line for the post gallery"
        />

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={() => navigate('/admin/dashboard')}>
            Cancel
          </button>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <section className="saved-posts-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Draft history</p>
            <h2>Previous versions</h2>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="state-panel">No saved revisions yet.</p>
        ) : (
          <div className="admin-post-list">
            {history.map((revision) => (
              <article className="admin-post-row" key={revision._id}>
                <div>
                  <h2>{revision.title || 'Untitled revision'}</h2>
                  <p>{new Date(revision.savedAt).toLocaleString()}</p>
                </div>
                <div className="admin-row-actions">
                  <button type="button" className="secondary-button" onClick={() => handleRestoreRevision(revision._id)}>
                    Restore
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
};

export default EditPostPage;
