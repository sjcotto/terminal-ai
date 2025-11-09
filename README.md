# 🤖 Terminal AI

A CLI tool that transforms your terminal experience by letting you talk to AI in natural language. The AI interprets your requests and executes the appropriate shell commands for you.

## ✨ Features

- **Natural Language Interface**: Describe what you want to do instead of remembering complex commands
- **Multiple AI Providers**: Choose between cloud (Anthropic Claude) or local (Ollama) AI models
- **AI-Powered Command Generation**: Uses advanced AI to understand your intent and generate appropriate commands
- **Safety First**: Shows you the command before execution and asks for confirmation
- **Context Aware**: Understands your current directory and system environment
- **Conversation History**: Maintains context across your session for follow-up requests
- **Danger Detection**: Warns you when commands might modify or delete files
- **Privacy Options**: Run completely offline with Ollama for full data privacy

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- **Choose one AI provider:**
  - **Anthropic Claude** (cloud): An Anthropic API key ([get one here](https://console.anthropic.com/))
  - **Ollama** (local): Ollama installed locally ([install from here](https://ollama.com/))

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

3. **Choose your AI provider:**

#### Option A: Using Anthropic Claude (Cloud)

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

Or create a `.env` file:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

#### Option B: Using Ollama (Local)

1. Install and start Ollama:
```bash
# Install Ollama from https://ollama.com/
ollama serve
```

2. Pull a recommended model (Qwen 2.5 Coder 7B):
```bash
ollama pull qwen2.5-coder:7b
```

Or use the larger quantized model mentioned:
```bash
# Note: This is a custom GGUF model - you would need to import it into Ollama
# Alternatively, use the standard qwen2.5-coder models:
ollama pull qwen2.5-coder:7b
ollama pull qwen2.5-coder:14b
ollama pull qwen2.5-coder:32b
```

3. Configure to use Ollama:
```bash
export AI_PROVIDER="ollama"
export OLLAMA_MODEL="qwen2.5-coder:7b"  # Optional, defaults to qwen2.5-coder:7b
```

Or add to `.env` file:
```bash
AI_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
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

#### AI Provider Selection
- `AI_PROVIDER`: Choose AI provider - `anthropic` or `ollama` (default: `anthropic`)

#### Anthropic Configuration
- `ANTHROPIC_API_KEY`: Your Anthropic API key (required when using Anthropic)

#### Ollama Configuration
- `OLLAMA_HOST`: Ollama server URL (default: `http://localhost:11434`)
- `OLLAMA_MODEL`: Model to use (default: `qwen2.5-coder:7b`)

#### Recommended Ollama Models

For best results with terminal commands, use code-focused models:
- `qwen2.5-coder:7b` - Fast and efficient (recommended)
- `qwen2.5-coder:14b` - Better accuracy, slower
- `qwen2.5-coder:32b` - Best accuracy, requires more resources
- `codellama:7b` - Alternative code model
- `deepseek-coder:6.7b` - Another good option

### Special Commands

- `exit` or `quit`: Exit the terminal
- `clear`: Clear conversation history

## 🏗️ Architecture

```
terminal-ai/
├── src/
│   ├── index.ts                      # Entry point with provider selection
│   ├── ai/
│   │   ├── provider.ts              # AI provider interface
│   │   ├── anthropic-provider.ts    # Anthropic/Claude implementation
│   │   ├── ollama-provider.ts       # Ollama implementation
│   │   ├── factory.ts               # Provider factory
│   │   ├── client.ts                # Re-exports for compatibility
│   │   ├── client.test.ts           # Anthropic provider tests
│   │   └── ollama-provider.test.ts  # Ollama provider tests
│   ├── terminal/
│   │   ├── prompt.ts                # Interactive prompt handler
│   │   ├── prompt.test.ts           # Prompt tests
│   │   ├── executor.ts              # Command executor
│   │   └── executor.test.ts         # Executor tests
│   └── utils/
│       ├── context.ts               # System context gathering
│       └── context.test.ts          # Context tests
├── package.json
├── tsconfig.json
└── vitest.config.ts                 # Test configuration
```

### Provider System

The application uses a flexible provider system that supports multiple AI backends:

- **AIProvider Interface**: Defines the contract for all AI providers
- **AnthropicProvider**: Cloud-based using Claude Sonnet 4.5
- **OllamaProvider**: Local inference with customizable models
- **Factory Pattern**: Automatically creates the right provider based on configuration

## 🧪 Testing

The project includes comprehensive unit tests with excellent coverage.

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage

- **Overall**: 98.59% statement coverage
- **Branches**: 96.42% coverage
- **Functions**: 100% coverage
- **Lines**: 98.59% coverage

All major components are thoroughly tested:
- AI client with conversation history
- Command executor with error handling
- System context gathering
- Terminal prompt interactions
- Main entry point and error handling

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📝 License

MIT

## ⚠️ Disclaimer

This tool executes shell commands based on AI suggestions. Always review commands before execution, especially those marked as dangerous. Use at your own risk.
