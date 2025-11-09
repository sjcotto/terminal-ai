# 🤖 Terminal AI

A CLI tool that transforms your terminal experience by letting you talk to AI in natural language. The AI interprets your requests and executes the appropriate shell commands for you.

## ✨ Features

- **Natural Language Interface**: Describe what you want to do instead of remembering complex commands
- **AI-Powered Command Generation**: Uses Claude AI to understand your intent and generate appropriate commands
- **Safety First**: Shows you the command before execution and asks for confirmation
- **Context Aware**: Understands your current directory and system environment
- **Conversation History**: Maintains context across your session for follow-up requests
- **Danger Detection**: Warns you when commands might modify or delete files

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (or Bun runtime)
- An Anthropic API key ([get one here](https://console.anthropic.com/))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd terminal-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up your API key:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

Or create a `.env` file:
```bash
cp .env.example .env
# Edit .env and add your API key
```

### Usage

Run in development mode:
```bash
npm run dev
```

Or build and run:
```bash
npm run build
npm start
```

## 💬 Example Conversations

```
You: show me all javascript files in this directory
💡 AI suggests:
   find . -name "*.js"
   Lists all JavaScript files in current directory and subdirectories
Execute this command? › Yes

You: what's my current git branch
💡 AI suggests:
   git branch --show-current
   Displays the name of the current Git branch
Execute this command? › Yes
```

## 🎯 Use Cases

- **File Management**: "find all PDFs larger than 10MB"
- **Git Operations**: "show me my recent commits"
- **System Info**: "how much disk space is left"
- **Process Management**: "show me running node processes"
- **Text Processing**: "count lines in all Python files"
- **Network**: "check if port 3000 is in use"

## 🛡️ Safety Features

1. **Command Preview**: Always shows the command before execution
2. **Confirmation Required**: Asks for approval before running commands
3. **Danger Warnings**: Highlights potentially destructive operations
4. **Exit Options**: Type `exit` or `quit` to leave anytime
5. **Clear History**: Type `clear` to reset conversation context

## 🔧 Configuration

### Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)

### Special Commands

- `exit` or `quit`: Exit the terminal
- `clear`: Clear conversation history

## 🏗️ Architecture

```
terminal-ai/
├── src/
│   ├── index.ts              # Entry point
│   ├── ai/
│   │   └── client.ts         # Claude API client
│   ├── terminal/
│   │   ├── prompt.ts         # Interactive prompt handler
│   │   └── executor.ts       # Command executor
│   └── utils/
│       └── context.ts        # System context gathering
├── package.json
└── tsconfig.json
```

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📝 License

MIT

## ⚠️ Disclaimer

This tool executes shell commands based on AI suggestions. Always review commands before execution, especially those marked as dangerous. Use at your own risk.
