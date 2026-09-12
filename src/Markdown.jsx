// The day reports are markdown with real tables in them. A line-by-line
// renderer that only knew headings and bullets printed every table as a row of
// pipes, so the whole end-of-day sheet read as noise. Tables are parsed here,
// which also fixes every report already written.
const inline = (text) =>
  String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      ),
    );

const cells = (line) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

// The row under the header: pipes, dashes, colons and spaces, nothing else.
const isDivider = (line) =>
  line.includes("-") && /^[\s|:-]+$/.test(line) && line.includes("|");

function parse(content) {
  const lines = String(content || "").split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("|") && isDivider(lines[i + 1] || "")) {
      const head = cells(lines[i]);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(cells(lines[i]));
        i++;
      }
      i--;
      blocks.push({ type: "table", head, rows });
    } else {
      blocks.push({ type: "line", line: lines[i] });
    }
  }
  return blocks;
}

export default function Markdown({ content }) {
  return (
    <div className="markdown-preview">
      {parse(content).map((block, i) => {
        if (block.type === "table")
          return (
            <div className="md-table-wrap" key={i}>
              <table className="md-table">
                <thead>
                  <tr>
                    {block.head.map((cell, j) => (
                      <th key={j}>{inline(cell)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, j) => (
                        <td key={j}>{inline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        const line = block.line;
        if (line.startsWith("### ")) return <h4 key={i}>{inline(line.slice(4))}</h4>;
        if (line.startsWith("## ")) return <h3 key={i}>{inline(line.slice(3))}</h3>;
        if (line.startsWith("# ")) return <h2 key={i}>{inline(line.slice(2))}</h2>;
        if (/^\d{1,2}\.\s/.test(line))
          return (
            <p className="md-list" key={i}>
              <span>{line.match(/^\d{1,2}/)[0]}.</span>
              {inline(line.replace(/^\d{1,2}\.\s/, ""))}
            </p>
          );
        if (/^[-*] /.test(line))
          return (
            <p className="md-list" key={i}>
              <span>\u2022</span>
              {inline(line.slice(2))}
            </p>
          );
        if (!line.trim()) return <div className="md-space" key={i} />;
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}
