using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
[Table("categories")]
public class Category
{
    [Key]
    [Column("id")] // Ánh xạ thuộc tính Id trong C# vào cột 'id' trong Postgres
    public int Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;
}