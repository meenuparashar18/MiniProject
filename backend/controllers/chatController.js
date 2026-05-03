const Post = require('../models/postModel');

const extractPlainText = (markdown = '') =>
  String(markdown)
    .replace(/[#>*`_\-\[\]\(\)!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildInput = (history, message, postContext) => {
  const items = [
    {
      role: 'system',
      content: [
        {
          type: 'input_text',
          text:
            'You are PersonalBlogAI, a friendly assistant inside a personal blog platform. Your main job is to guide users on how to use the platform, explain Markdown formatting, answer common app questions, and help them understand features like creating posts, editing posts, categories, login, and navigation. You can also recommend posts and categories from the blog when helpful. When users ask about Markdown, explain it clearly with short practical examples such as headings, bold text, lists, links, images, blockquotes, and code blocks. Prefer direct, helpful, user-facing answers over technical implementation details. Keep answers concise, warm, and easy for beginners to follow.',
        },
      ],
    },
    {
      role: 'system',
      content: [
        {
          type: 'input_text',
          text:
            'Platform facts: users can browse posts on the home page, open posts with SEO-friendly slugs, filter by category, log in as admin, create posts, edit posts, delete posts, and write content in Markdown. The chatbot should make the platform feel interactive and user-friendly.',
        },
      ],
    },
  ];

  if (postContext.length > 0) {
    items.push({
      role: 'system',
      content: [
        {
          type: 'input_text',
          text: `Recent posts in the app:\n${postContext.join('\n')}`,
        },
      ],
    });
  }

  history.slice(-6).forEach((entry) => {
    items.push({
      role: entry.role === 'assistant' ? 'assistant' : 'user',
      content: [{ type: 'input_text', text: entry.content }],
    });
  });

  items.push({
    role: 'user',
    content: [{ type: 'input_text', text: message }],
  });

  return items;
};

const markdownGuide = `Here are quick Markdown basics:

# Heading 1
## Heading 2
**bold text**
*italic text*
- bullet item
1. numbered item
[link text](https://example.com)
![image alt](https://example.com/image.jpg)
> blockquote
\`\`\`
code block
\`\`\`

Write in the editor, save the post, and the app will render it nicely on the post page.`;

const getRuleBasedReply = async (message) => {
  const text = message.toLowerCase().trim();

  if (/(markdown|format|heading|bold|italic|list|link|image|blockquote|code)/.test(text)) {
    return markdownGuide;
  }

  if (/(create post|new post|how.*create)/.test(text)) {
    return 'To create a post, log in as admin, open the dashboard, click "Create Post", add a title, author, categories, and Markdown content, then submit. The post will appear on the home page after saving.';
  }

  if (/(edit post|update post|change post)/.test(text)) {
    return 'To edit a post, log in, open the admin dashboard, click "Edit" next to the post, update the title, categories, or Markdown content, and save your changes.';
  }

  if (/(delete post|remove post)/.test(text)) {
    return 'To delete a post, open the admin dashboard and click "Delete" beside the post you want to remove. The app will ask for confirmation before deleting it.';
  }

  if (/(login|sign in|admin)/.test(text)) {
    return 'Use the Admin Login page to sign in. After login, you can open the dashboard, create posts, edit posts, delete posts, and manage categories.';
  }

  if (/(categor|tag)/.test(text)) {
    return 'Categories help organize posts by topic. Add them in the create or edit form as comma-separated values like "React, JavaScript, Tutorials". Visitors can click category pills to filter posts.';
  }

  if (/(slug|url)/.test(text)) {
    return 'Each post gets a slug automatically from its title. That creates cleaner URLs like /post/my-first-post instead of long database IDs.';
  }

  if (/(home page|browse|read posts|find posts|use this platform|how.*use)/.test(text)) {
    return 'Visitors can browse posts from the home page, open any post to read the full article, click categories to filter by topic, and use the chatbot for help with platform usage or Markdown.';
  }

  if (/(what can you do|help|commands|common questions)/.test(text)) {
    return 'I can help with platform usage, creating/editing/deleting posts, categories, admin login, and Markdown formatting. Try asking "How do I create a post?" or "Explain Markdown headings".';
  }

  const recentPosts = await Post.find({}).sort({ createdAt: -1 }).limit(3);
  if (/(recommend|suggest|what should i read|what to read)/.test(text) && recentPosts.length > 0) {
    return `You can start with these recent posts: ${recentPosts.map((post) => post.title).join(', ')}.`;
  }

  return 'I can help with platform usage, Markdown formatting, admin login, creating posts, editing posts, deleting posts, categories, and finding content. Ask me something like "How do I create a post?" or "Show me Markdown examples".';
};

exports.chat = async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: 'Please send a chat message.' });
  }

  try {
    const ruleBasedReply = await getRuleBasedReply(message);

    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({ reply: ruleBasedReply });
    }

    const recentPosts = await Post.find({}).sort({ createdAt: -1 }).limit(5);
    const postContext = recentPosts.map(
      (post) =>
        `- ${post.title} (${post.slug})${post.categories?.length ? ` | categories: ${post.categories.join(', ')}` : ''}`
    );

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: buildInput(history, message, postContext),
        max_output_tokens: 300,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({ reply: ruleBasedReply });
    }

    const text =
      data.output_text ||
      data.output
        ?.flatMap((item) => item.content || [])
        .filter((item) => item.type === 'output_text')
        .map((item) => item.text)
        .join('\n')
        .trim();

    return res.status(200).json({
      reply: text || ruleBasedReply,
    });
  } catch (error) {
    console.error('Chat error:', error);
    try {
      const fallbackReply = await getRuleBasedReply(message);
      return res.status(200).json({ reply: fallbackReply });
    } catch {
      return res.status(200).json({
        reply:
          'I can help with platform usage, Markdown formatting, categories, admin login, and post management. Try asking a specific question.',
      });
    }
  }
};

exports.writingTools = async (req, res) => {
  const { action, title = '', content = '', categories = '', tags = '' } = req.body;
  const plainText = extractPlainText(content);

  if (!action) {
    return res.status(400).json({ message: 'Please choose a writing action.' });
  }

  const fallbackByAction = {
    title: `Suggested title: ${title?.trim() || plainText.split(' ').slice(0, 6).join(' ') || 'Fresh ideas for your next post'}`,
    improve: plainText
      ? `${title ? `# ${title.trim()}\n\n` : ''}${plainText}\n\n## Quick polish ideas\n- Add one concrete example.\n- End with a short takeaway.\n- Break long paragraphs into smaller ones.`
      : 'Write a short draft first, then I can improve it.',
    summarize: plainText
      ? `Summary: ${plainText.split(' ').slice(0, 32).join(' ')}${plainText.split(' ').length > 32 ? '...' : ''}`
      : 'Add some content first so I can summarize it.',
    tags: categories
      ? `Suggested tags: ${String(categories)
          .split(',')
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean)
          .map((item) => `#${item.replace(/\s+/g, '-')}`)
          .join(', ')}`
      : `Suggested tags: ${tags || '#writing, #blog, #ideas'}`,
  };

  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({ result: fallbackByAction[action] || 'I could not generate that just yet.' });
  }

  try {
    const prompts = {
      title: `Generate 5 blog post title options for this draft.\nCurrent title: ${title}\nContent: ${plainText}`,
      improve: `Improve this blog draft while preserving the writer's meaning. Return polished Markdown only.\nTitle: ${title}\nContent: ${content}`,
      summarize: `Summarize this blog draft in 2 concise sentences.\nTitle: ${title}\nContent: ${content}`,
      tags: `Suggest 8 short tags/hashtags for this blog post. Return a comma-separated list only.\nTitle: ${title}\nCategories: ${categories}\nCurrent tags: ${tags}\nContent: ${plainText}`,
    };

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: prompts[action],
        max_output_tokens: 500,
      }),
    });

    const data = await response.json();
    const text =
      data.output_text ||
      data.output
        ?.flatMap((item) => item.content || [])
        .filter((item) => item.type === 'output_text')
        .map((item) => item.text)
        .join('\n')
        .trim();

    return res.status(200).json({
      result: text || fallbackByAction[action] || 'I could not generate that just yet.',
    });
  } catch (error) {
    return res.status(200).json({
      result: fallbackByAction[action] || 'I could not generate that just yet.',
    });
  }
};
