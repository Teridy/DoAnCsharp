using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("stalls")]
public class Stall
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Column("categories_id")]
    public int CategoriesId { get; set; }  // ✅ Fix 3: bỏ ?

    [ForeignKey("CategoriesId")]
    public Category Category { get; set; }

    [ForeignKey("NarrationPointsId")]
    public NarrationPoint NarrationPoint { get; set; }

    [Column("narration_points_id")]
    public int? NarrationPointsId { get; set; }

    [Column("latitude")]
    public float? Latitude { get; set; }

    [Column("longitude")]
    public float? Longitude { get; set; }

    [Column("audios_id")]
    public int? AudiosId { get; set; }

    [Column("status")]
    public StallStatus Status { get; set; } = StallStatus.Unclaimed;  // ✅ Fix 2: thêm default

    [Column("owner_id")]
    public string? OwnerId { get; set; }

    [Column("image_url")]
    public string? ImageUrl { get; set; }

    [NotMapped]
    public IFormFile? Image { get; set; }

    [Column("is_claimed")]
    public bool IsClaimed { get; set; } = false;

    public enum StallStatus
    {
        Unclaimed = 0,
        Pending = 1,
        Active = 2,
        Closed = 3,
        Rejected = 4
    }
}