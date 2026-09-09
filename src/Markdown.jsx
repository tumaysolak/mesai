export default function Markdown({ content }) {
  return (
    <div className="markdown-preview">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("### ")) return <h4 key={i}>{line.slice(4)}</h4>;
        if (line.startsWith("## ")) return <h3 key={i}>{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h2 key={i}>{line.slice(2)}</h2>;
        if (/^[-*] /.test(line))
          return (
            <p className="md-list" key={i}>
              <span>•</span>
              {line.slice(2)}
            </p>
          );
        if (!line.trim()) return <div className="md-space" key={i} />;
        return <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, "$1")}</p>;
      })}
    </div>
  );
}
