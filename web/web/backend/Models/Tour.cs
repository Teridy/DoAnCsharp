using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("tours")]
public class Tour
{
    [Key]
    [Column("id")]
    public int id { get; set; }

    [Column("name")]
    public string name { get; set; }

    [Column("description")]
    public string description { get; set; }

    [Column("duration")]
    public int duration { get; set; }

    [Column("status")]
    public string status { get; set; }

    [Column("created_at")]
    public DateTime created_at { get; set; } = DateTime.Now;
    public ICollection<TourPoi> TourPois { get; set; }

}