using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
[Table("images")]
public class Image
{
    [Key]
    [Column("id")]
    public int Id { get; set; }
    [Column("narration_point_id")]
    public int NarrationPointId { get; set; }
    [Column("image_url")]
    public string ImageUrl { get; set; } = string.Empty;

    // Navigation property
    public NarrationPoint? NarrationPoint { get; set; }
}