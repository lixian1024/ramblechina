# Evals execution model

`EVALS.md` 是产品语义真相；`evals/cases.json` 是机器索引。

每个 Eval 最终应该落到以下三类之一：

- `deterministic`：可直接用代码断言，例如跨城防护、数据状态、稳定 diff；
- `product`：需要运行真实产品流程并检查输出；可以先由测试 harness + structured judge 辅助，但关键实验仍需 Human Gate；
- `live-data`：依赖营业时间、天气、门票等外部事实，必须有真实数据 adapter，禁止用模型记忆代替。

## 接入真实 app

在 `loop.config.json` 添加项目验证命令，例如：

```json
{
  "verification": {
    "commands": [
      "npm test -- --runInBand",
      "npm run typecheck"
    ],
    "task_commands": {
      "T-002": ["npm run eval -- E-003 E-004 E-009"]
    }
  }
}
```

Engine 会先运行 deterministic checks，再让独立 Codex Critic 检查 relevant Evals。两者都不能用来伪造实时事实。
